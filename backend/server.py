from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from models import (
    RegisterInput, LoginInput, ChatInput, RequestInput, ClarifyInput,
    RejectInput, MatchPreviewInput, WatchlistInput, PostUpdateInput, now_iso, new_id,
)
from auth import hash_password, verify_password, create_access_token, get_current_user_factory
import ai_service
from seed import seed

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api = APIRouter(prefix="/api")

get_current_user = None  # set on startup


async def current_user(request: Request):
    return await get_current_user(request)


async def require_role(request: Request, role: str):
    user = await get_current_user(request)
    if user["role"] != role:
        raise HTTPException(status_code=403, detail=f"Requires {role} account")
    return user


def _public_user(u: dict) -> dict:
    u.pop("password_hash", None)
    u.pop("_id", None)
    return u


# ---------------- Auth ----------------
@api.post("/auth/register")
async def register(payload: RegisterInput, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = payload.model_dump()
    doc.pop("password")
    doc["id"] = new_id()
    doc["email"] = email
    doc["password_hash"] = hash_password(payload.password)
    doc["created_at"] = now_iso()
    await db.users.insert_one(doc)
    token = create_access_token(doc["id"], email, doc["role"])
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    return {"token": token, "user": _public_user(dict(doc))}


@api.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email, user["role"])
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    return {"token": token, "user": _public_user(dict(user))}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user


# ---------------- Chat ----------------
@api.post("/chat/message")
async def chat_message(payload: ChatInput):
    history = [m.model_dump() for m in payload.history]
    result = await ai_service.identify_medication(payload.session_id, history, payload.message)
    await db.chat_messages.insert_one({
        "id": new_id(), "session_id": payload.session_id,
        "user_message": payload.message, "ai_reply": result["reply"],
        "identified": result["identified"], "created_at": now_iso(),
    })
    return result


# ---------------- Requests (patient) ----------------
def _blind_view(req: dict, viewer_pharmacy_id: str = None) -> dict:
    r = dict(req)
    r.pop("_id", None)
    accepted_by = r.get("accepted_by") or {}
    is_owner_pharmacy = viewer_pharmacy_id and accepted_by.get("pharmacy_id") == viewer_pharmacy_id
    if not is_owner_pharmacy:
        r.pop("patient_name", None)
        r.pop("patient_phone", None)
        r.pop("patient_email", None)
        if r.get("contact"):
            r["contact"] = None
    return r


@api.post("/requests")
async def create_request(payload: RequestInput, request: Request):
    user = await require_role(request, "patient")
    doc = {
        "id": new_id(),
        "patient_id": user["id"],
        "patient_name": user["name"],
        "patient_phone": user.get("phone", ""),
        "patient_email": user["email"],
        "medication": payload.medication.model_dump(),
        "schedule": payload.schedule,
        "fridge": payload.fridge,
        "specialty": payload.specialty,
        "transfer_status": payload.transfer_status,
        "prescriber_status": payload.prescriber_status,
        "prescription_status": payload.prescription_status,
        "delivery_pref": payload.delivery_pref,
        "max_fee": payload.max_fee,
        "fill_today": payload.fill_today,
        "notes": payload.notes or "",
        "status": "queued",
        "clarifications": [],
        "refinements": [],
        "post_updates": [],
        "accepted_by": None,
        "platform_fee": 0.0,
        "contact": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.requests.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/requests/mine")
async def my_requests(request: Request):
    user = await require_role(request, "patient")
    docs = await db.requests.find({"patient_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@api.post("/requests/preview-match")
async def preview_match(payload: MatchPreviewInput, request: Request):
    await require_role(request, "patient")
    query = {"role": "pharmacy"}
    if payload.delivery_pref == "free":
        query["delivery_free"] = True
    if payload.fill_today:
        query["can_fill_today"] = True
    pharmacies = await db.users.find(query, {"_id": 0}).to_list(500)
    if payload.delivery_pref == "fee" and payload.max_fee is not None:
        pharmacies = [p for p in pharmacies if float(p.get("delivery_fee", 0)) <= float(payload.max_fee)]
    count = len(pharmacies)
    suggestion = None
    if count < 2:
        suggestion = await ai_service.filter_suggestion(
            payload.medication_name or "", count, payload.delivery_pref, payload.fill_today
        )
    return {"count": count, "suggestion": suggestion}


# ---------------- Queue (pharmacy) ----------------
@api.get("/requests/queue")
async def queue(request: Request, schedule: str = "all", fridge: bool = False,
                specialty: bool = False, watchlist_only: bool = False):
    user = await require_role(request, "pharmacy")
    q = {"status": {"$in": ["queued", "clarifying"]}, "accepted_by": None}
    if schedule and schedule != "all":
        q["schedule"] = schedule
    if fridge:
        q["fridge"] = True
    if specialty:
        q["specialty"] = True
    docs = await db.requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    watch = [w.lower() for w in user.get("watchlist", [])]
    result = []
    for d in docs:
        name = (d.get("medication", {}).get("name", "") or "").lower()
        d["watchlist_hit"] = any(w in name or name in w for w in watch if w)
        result.append(_blind_view(d, user["id"]))
    if watchlist_only:
        result = [r for r in result if r.get("watchlist_hit")]
    return result


@api.get("/requests/accepted")
async def accepted_requests(request: Request):
    user = await require_role(request, "pharmacy")
    docs = await db.requests.find(
        {"accepted_by.pharmacy_id": user["id"]}, {"_id": 0}
    ).sort("updated_at", -1).to_list(200)
    return docs


@api.post("/requests/{req_id}/clarify")
async def clarify(req_id: str, payload: ClarifyInput, request: Request):
    user = await require_role(request, "pharmacy")
    req = await db.requests.find_one({"id": req_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.get("accepted_by"):
        raise HTTPException(status_code=400, detail="Request already accepted")
    entry = {"pharmacy_id": user["id"], "pharmacy_name": user.get("pharmacy_name") or user["name"],
             "question": payload.question, "created_at": now_iso()}
    await db.requests.update_one(
        {"id": req_id},
        {"$push": {"clarifications": entry}, "$set": {"status": "clarifying", "updated_at": now_iso()}},
    )
    return {"ok": True}


@api.post("/requests/{req_id}/reject")
async def reject(req_id: str, payload: RejectInput, request: Request):
    await require_role(request, "pharmacy")
    req = await db.requests.find_one({"id": req_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.get("accepted_by"):
        raise HTTPException(status_code=400, detail="Request already accepted")
    summary = await ai_service.refine_request(
        req.get("medication", {}), req.get("clarifications", []), payload.reason
    )
    refinement = {"summary": summary, "created_at": now_iso()}
    await db.requests.update_one(
        {"id": req_id},
        {"$push": {"refinements": refinement}, "$set": {"status": "queued", "clarifications": [], "updated_at": now_iso()}},
    )
    return {"ok": True, "summary": summary}


@api.post("/requests/{req_id}/accept")
async def accept(req_id: str, request: Request):
    user = await require_role(request, "pharmacy")
    req = await db.requests.find_one({"id": req_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.get("accepted_by"):
        raise HTTPException(status_code=400, detail="Request already accepted by another pharmacy")
    fee = float(os.environ.get("PLATFORM_FEE", "4.99"))
    contact = {
        "patient_name": req.get("patient_name"),
        "patient_phone": req.get("patient_phone"),
        "patient_email": req.get("patient_email"),
        "pharmacy_name": user.get("pharmacy_name") or user["name"],
        "pharmacy_phone": user.get("phone"),
        "pharmacy_address": user.get("address"),
    }
    await db.requests.update_one(
        {"id": req_id},
        {"$set": {
            "status": "accepted",
            "accepted_by": {"pharmacy_id": user["id"], "pharmacy_name": user.get("pharmacy_name") or user["name"]},
            "platform_fee": fee,
            "contact": contact,
            "updated_at": now_iso(),
        }},
    )
    return {"ok": True, "platform_fee": fee, "contact": contact, "payment": "simulated"}


# ---------------- Pharmacy profile ----------------
POST_UPDATE_FEE = 0.50


@api.post("/requests/{req_id}/post-update")
async def post_update(req_id: str, payload: PostUpdateInput, request: Request):
    user = await require_role(request, "pharmacy")
    req = await db.requests.find_one({"id": req_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    accepted_by = req.get("accepted_by") or {}
    if req.get("status") != "accepted" or accepted_by.get("pharmacy_id") != user["id"]:
        raise HTTPException(status_code=400, detail="You can only update requests you have accepted")
    entry = {
        "id": new_id(),
        "field": payload.field,
        "value": payload.value,
        "note": payload.note or "",
        "pharmacy_name": user.get("pharmacy_name") or user["name"],
        "fee": POST_UPDATE_FEE,
        "created_at": now_iso(),
    }
    await db.requests.update_one(
        {"id": req_id},
        {"$push": {"post_updates": entry}, "$set": {"updated_at": now_iso()}},
    )
    await db.earnings.insert_one({
        "id": new_id(),
        "pharmacy_id": user["id"],
        "amount": POST_UPDATE_FEE,
        "reason": f"Post-payment update: {payload.field}",
        "request_id": req_id,
        "medication": req.get("medication", {}).get("name", ""),
        "created_at": now_iso(),
    })
    return {"ok": True, "update": entry, "fee_earned": POST_UPDATE_FEE}


@api.get("/pharmacy/earnings")
async def earnings(request: Request):
    user = await require_role(request, "pharmacy")
    entries = await db.earnings.find({"pharmacy_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    total = round(sum(float(e.get("amount", 0)) for e in entries), 2)
    return {"total": total, "count": len(entries), "entries": entries}


@api.put("/pharmacy/watchlist")
async def update_watchlist(payload: WatchlistInput, request: Request):
    user = await require_role(request, "pharmacy")
    await db.users.update_one({"id": user["id"]}, {"$set": {"watchlist": payload.watchlist}})
    return {"watchlist": payload.watchlist}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    global get_current_user
    get_current_user = await get_current_user_factory(db)
    await db.users.create_index("email", unique=True)
    await db.requests.create_index("status")
    await seed(db)
    logger.info("Startup complete; demo data seeded.")


@app.on_event("shutdown")
async def shutdown():
    client.close()
