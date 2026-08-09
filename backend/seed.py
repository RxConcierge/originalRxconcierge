import os
from datetime import datetime, timezone, timedelta
from models import now_iso, new_id
from auth import hash_password


def _user(email, name, role, **extra):
    doc = {
        "id": new_id(),
        "email": email.lower(),
        "password_hash": hash_password("demo123"),
        "name": name,
        "role": role,
        "phone": extra.get("phone", ""),
        "pharmacy_name": extra.get("pharmacy_name", ""),
        "address": extra.get("address", ""),
        "delivery_free": extra.get("delivery_free", False),
        "delivery_fee": extra.get("delivery_fee", 0.0),
        "can_fill_today": extra.get("can_fill_today", False),
        "has_fridge": extra.get("has_fridge", False),
        "specialties": extra.get("specialties", False),
        "schedules": extra.get("schedules", []),
        "watchlist": extra.get("watchlist", []),
        "created_at": now_iso(),
    }
    return doc


async def seed(db):
    # Admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@medfind.com").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "id": new_id(), "email": admin_email, "password_hash": hash_password(admin_pw),
            "name": "Admin", "role": "admin", "created_at": now_iso(),
        })

    if await db.users.count_documents({"role": "patient"}) > 0:
        return  # demo data already present

    patient = _user("patient@demo.com", "Jordan Rivera", "patient", phone="+1-555-0142")
    patient2 = _user("alex@demo.com", "Alex Kim", "patient", phone="+1-555-0177")

    pharmA = _user(
        "downtown@demo.com", "Downtown Rx", "pharmacy",
        phone="+1-555-2200", pharmacy_name="Downtown Rx",
        address="120 Market St, Springfield",
        delivery_free=True, delivery_fee=0.0, can_fill_today=True,
        has_fridge=True, specialties=True, schedules=["II", "III-V"],
        watchlist=["Ozempic", "Adderall"],
    )
    pharmB = _user(
        "greenvalley@demo.com", "Green Valley Pharmacy", "pharmacy",
        phone="+1-555-3311", pharmacy_name="Green Valley Pharmacy",
        address="88 Orchard Ave, Springfield",
        delivery_free=False, delivery_fee=5.0, can_fill_today=False,
        has_fridge=True, specialties=False, schedules=["III-V"],
        watchlist=["Wegovy"],
    )
    await db.users.insert_many([patient, patient2, pharmA, pharmB])

    reqs = [
        {
            "id": new_id(), "patient_id": patient["id"],
            "patient_name": patient["name"], "patient_phone": patient["phone"], "patient_email": patient["email"],
            "medication": {"name": "Ozempic", "dose": "0.5mg", "form": "injection pen", "quantity": "1 pen"},
            "schedule": "none", "fridge": True, "specialty": True,
            "delivery_pref": "free", "max_fee": None, "fill_today": True,
            "notes": "", "status": "queued", "clarifications": [], "refinements": [],
            "accepted_by": None, "platform_fee": 0.0, "contact": None,
            "created_at": now_iso(), "updated_at": now_iso(),
        },
        {
            "id": new_id(), "patient_id": patient2["id"],
            "patient_name": patient2["name"], "patient_phone": patient2["phone"], "patient_email": patient2["email"],
            "medication": {"name": "Adderall XR", "dose": "20mg", "form": "capsule", "quantity": "30"},
            "schedule": "II", "fridge": False, "specialty": False,
            "delivery_pref": "any", "max_fee": 10.0, "fill_today": False,
            "notes": "", "status": "queued", "clarifications": [], "refinements": [],
            "accepted_by": None, "platform_fee": 0.0, "contact": None,
            "created_at": now_iso(), "updated_at": now_iso(),
        },
        {
            "id": new_id(), "patient_id": patient2["id"],
            "patient_name": patient2["name"], "patient_phone": patient2["phone"], "patient_email": patient2["email"],
            "medication": {"name": "Amoxicillin", "dose": "500mg", "form": "capsule", "quantity": "21"},
            "schedule": "none", "fridge": False, "specialty": False,
            "delivery_pref": "fee", "max_fee": 8.0, "fill_today": True,
            "notes": "", "status": "clarifying", "refinements": [],
            "clarifications": [{"pharmacy_id": pharmB["id"], "pharmacy_name": "Green Valley Pharmacy",
                                 "question": "Is a generic acceptable, or brand only?", "created_at": now_iso()}],
            "accepted_by": None, "platform_fee": 0.0, "contact": None,
            "created_at": now_iso(), "updated_at": now_iso(),
        },
    ]
    await db.requests.insert_many(reqs)
