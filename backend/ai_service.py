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
    "You are MedFind AI, a warm, concise intake assistant for a pharmacy marketplace. "
    "Your job is to collect a complete medication intake from the patient, ONE short question at a time. "
    "Collect these fields:\n"
    "1. name — brand or generic medication name\n"
    "2. dose — strength, e.g. 10mg\n"
    "3. form — tablet, capsule, injection, inhaler, cream, liquid, etc.\n"
    "4. quantity — how many / how much they need (e.g. 30, 1 pen)\n"
    "5. transfer — is this being TRANSFERRED from another pharmacy? (true/false)\n"
    "6. has_rx — does the patient already have a paper prescription (Rx) in hand? (true/false)\n"
    "7. prescriber_call — does the pharmacy need to CALL the prescriber to obtain the prescription? "
    "(true/false; usually true when has_rx is false)\n"
    "NEVER give medical advice, dosing recommendations, or diagnoses. Ask naturally and briefly. "
    "CLINICAL VALIDATION: Use your medical knowledge to make sure the drug + form combination is real and correct. "
    "If the patient gives an impossible or wrong combination (e.g. 'Valtrex capsules' when Valtrex only comes as tablets/caplets, "
    "or 'insulin tablets' when insulin is injectable), GENTLY correct them, explain briefly, and set identified.form to the correct form. "
    "Once you have name, dose, form, quantity AND the three yes/no statuses (transfer, has_rx, prescriber_call), set ready=true. "
    "The MOMENT ready becomes true, your 'reply' MUST be a short proactive closing message, for example: "
    "\"I've gathered your medication details — [name] [dose] [form], qty [quantity]. Click Continue below to submit your Blind Request to local pharmacies.\" "
    "Do NOT ask any further questions once ready is true. "
    "ALWAYS respond with ONLY a valid JSON object and nothing else, in this exact shape: "
    '{"reply": "<message to the patient>", '
    '"identified": {"name": "", "dose": "", "form": "", "quantity": "", "transfer": false, "has_rx": false, "prescriber_call": false} or null, '
    '"ready": true or false}. '
    "Fill identified with whatever is known so far (empty string / false for unknown parts); use null only when nothing is known yet."
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


CLASSIFY_SYSTEM = "You are a licensed pharmacist classifying medications for pharmacy operations."


async def classify_drug(name: str, form: str = "") -> dict:
    prompt = (
        f"Classify the medication '{name}'{f' ({form})' if form else ''} for pharmacy operations. "
        "Respond with ONLY a JSON object: "
        '{"schedule": "none" | "II" | "III-V", "fridge": true/false, "specialty": true/false}. '
        "schedule = US DEA controlled-substance schedule (use 'II' for Schedule II like Adderall/oxycodone, "
        "'III-V' for Schedule III-V like codeine/testosterone/alprazolam, 'none' if not controlled). "
        "fridge = true if it requires refrigerated storage (e.g. insulin, many injectables/biologics). "
        "specialty = true if it is a specialty / limited-distribution / biologic drug (e.g. Humira, Ozempic, Enbrel). "
        "Base this strictly on real pharmacology. If unsure, use 'none', false, false."
    )
    chat = LlmChat(api_key=_key(), session_id="classify", system_message=CLASSIFY_SYSTEM).with_model(
        MODEL_PROVIDER, MODEL_NAME
    )
    try:
        data = json.loads(_clean_json(await chat.send_message(UserMessage(text=prompt))))
        sched = data.get("schedule", "none")
        if sched not in ("none", "II", "III-V"):
            sched = "none"
        return {"schedule": sched, "fridge": bool(data.get("fridge")), "specialty": bool(data.get("specialty"))}
    except Exception:
        return {"schedule": "none", "fridge": False, "specialty": False}


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
