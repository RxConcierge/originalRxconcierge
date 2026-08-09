import os
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage

MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-4-6"


def _key() -> str:
    return os.environ.get("EMERGENT_LLM_KEY", "")


def _clean_json(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1] if "```" in raw else raw
        if raw.lstrip().startswith("json"):
            raw = raw.lstrip()[4:]
    return raw.strip().strip("`").strip()


IDENTIFY_SYSTEM = (
    "You are MedFind AI, a warm, concise assistant for a pharmacy marketplace. "
    "Your ONLY job is to help a patient identify a medication they need: its brand or generic NAME, "
    "the DOSE (strength, e.g. 10mg), and the FORM (tablet, capsule, injection, inhaler, cream, liquid, etc.). "
    "Ask short questions, one at a time. NEVER give medical advice, dosing recommendations, or diagnoses. "
    "When you know name, dose and form with reasonable confidence, set ready=true. "
    "ALWAYS respond with ONLY a valid JSON object and nothing else, in this exact shape: "
    '{"reply": "<message to the patient>", "identified": {"name": "", "dose": "", "form": ""} or null, "ready": true or false}. '
    "Fill identified with whatever is known so far (empty string for unknown parts); use null only when nothing is known yet."
)


async def identify_medication(session_id: str, history: list, message: str) -> dict:
    transcript = ""
    for m in history:
        who = "Patient" if m.get("role") == "user" else "Assistant"
        transcript += f"{who}: {m.get('text','')}\n"
    prompt = f"Conversation so far:\n{transcript}\nPatient: {message}\n\nRespond now with the JSON object."

    chat = LlmChat(
        api_key=_key(),
        session_id=session_id,
        system_message=IDENTIFY_SYSTEM,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)

    try:
        raw = await chat.send_message(UserMessage(text=prompt))
        data = json.loads(_clean_json(raw))
        return {
            "reply": data.get("reply", ""),
            "identified": data.get("identified"),
            "ready": bool(data.get("ready", False)),
        }
    except Exception:
        return {
            "reply": "Could you tell me the medication name, its strength (dose), and the form (tablet, capsule, injection, etc.)?",
            "identified": None,
            "ready": False,
        }


async def refine_request(medication: dict, clarifications: list, reason: str) -> str:
    q = "\n".join(f"- {c.get('pharmacy_name','A pharmacy')} asked: {c.get('question','')}" for c in clarifications) or "- (none)"
    prompt = (
        f"Medication: {medication.get('name','')} {medication.get('dose','')} {medication.get('form','')}.\n"
        f"Pharmacy clarification questions:\n{q}\n"
        f"Rejection reason from the pharmacy: {reason}\n\n"
        "Write a concise 1-2 sentence refinement note that adds clarity for OTHER pharmacies so this request can be fulfilled "
        "(what was missing, constraints now known). Plain text only, no preamble."
    )
    chat = LlmChat(api_key=_key(), session_id="refine", system_message="You refine pharmacy fulfilment requests.").with_model(
        MODEL_PROVIDER, MODEL_NAME
    )
    try:
        return (await chat.send_message(UserMessage(text=prompt))).strip()
    except Exception:
        return f"Refined after clarification: {reason}".strip()


async def filter_suggestion(medication_name: str, count: int, delivery_pref: str, fill_today: bool) -> str:
    prompt = (
        f"A patient requested '{medication_name or 'a medication'}' with delivery preference '{delivery_pref}'"
        f"{' and needs it filled today' if fill_today else ''}. Only {count} pharmacies match. "
        "In ONE short friendly sentence, suggest which single filter to relax to see more results. Plain text only."
    )
    chat = LlmChat(api_key=_key(), session_id="suggest", system_message="You help patients broaden pharmacy search filters.").with_model(
        MODEL_PROVIDER, MODEL_NAME
    )
    try:
        return (await chat.send_message(UserMessage(text=prompt))).strip()
    except Exception:
        return "Try turning off 'Fill Today' or allowing fee-based delivery to see more pharmacies."
