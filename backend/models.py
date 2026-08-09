from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- Auth ----------
class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["patient", "pharmacy"]
    phone: Optional[str] = ""
    # pharmacy-only profile
    pharmacy_name: Optional[str] = ""
    address: Optional[str] = ""
    delivery_free: Optional[bool] = False
    delivery_fee: Optional[float] = 0.0
    can_fill_today: Optional[bool] = False
    has_fridge: Optional[bool] = False
    specialties: Optional[bool] = False
    schedules: Optional[List[str]] = Field(default_factory=list)
    watchlist: Optional[List[str]] = Field(default_factory=list)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


# ---------- Chat ----------
class ChatMessage(BaseModel):
    role: str
    text: str


class ChatInput(BaseModel):
    session_id: str
    message: str
    history: List[ChatMessage] = Field(default_factory=list)


# ---------- Medication + Request ----------
class Medication(BaseModel):
    name: str = ""
    dose: str = ""
    form: str = ""
    quantity: str = ""


class RequestInput(BaseModel):
    medication: Medication
    schedule: Literal["none", "II", "III-V"] = "none"
    fridge: bool = False
    specialty: bool = False
    delivery_pref: Literal["free", "fee", "any"] = "any"
    max_fee: Optional[float] = None
    fill_today: bool = False
    notes: Optional[str] = ""


class ClarifyInput(BaseModel):
    question: str


class RejectInput(BaseModel):
    reason: str


class MatchPreviewInput(BaseModel):
    delivery_pref: Literal["free", "fee", "any"] = "any"
    max_fee: Optional[float] = None
    fill_today: bool = False
    medication_name: Optional[str] = ""


class WatchlistInput(BaseModel):
    watchlist: List[str]
