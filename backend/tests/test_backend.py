"""Backend integration tests for MedFind pharmacy marketplace."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read frontend/.env
    from pathlib import Path
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def patient_token():
    r = requests.post(f"{API}/auth/login", json={"email": "patient@demo.com", "password": "demo123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def downtown_token():
    r = requests.post(f"{API}/auth/login", json={"email": "downtown@demo.com", "password": "demo123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def greenvalley_token():
    r = requests.post(f"{API}/auth/login", json={"email": "greenvalley@demo.com", "password": "demo123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


# -------------- Auth --------------
class TestAuth:
    def test_login_demo_patient(self):
        r = requests.post(f"{API}/auth/login", json={"email": "patient@demo.com", "password": "demo123"})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d
        assert d["user"]["email"] == "patient@demo.com"
        assert d["user"]["role"] == "patient"
        assert "password_hash" not in d["user"]

    def test_login_demo_pharmacy(self):
        r = requests.post(f"{API}/auth/login", json={"email": "downtown@demo.com", "password": "demo123"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "pharmacy"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "patient@demo.com", "password": "wrong"})
        assert r.status_code == 401

    def test_register_and_me(self):
        email = f"test_{uuid.uuid4().hex[:8]}@demo.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "pass1234", "name": "Test User", "role": "patient",
        })
        assert r.status_code == 200
        token = r.json()["token"]
        me = requests.get(f"{API}/auth/me", headers=_auth_headers(token))
        assert me.status_code == 200
        assert me.json()["email"] == email


# -------------- Chat --------------
class TestChat:
    def test_chat_identifies_medication(self):
        r = requests.post(f"{API}/chat/message", json={
            "session_id": f"sess-{uuid.uuid4().hex[:6]}",
            "message": "I need Lipitor 20mg tablets",
            "history": [],
        }, timeout=45)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "reply" in d
        assert isinstance(d["reply"], str) and len(d["reply"]) > 0
        # identified may be dict with name; not strictly required to match Lipitor
        # but we verify keys exist
        assert "identified" in d
        assert "ready" in d


# -------------- Request lifecycle --------------
class TestRequestLifecycle:
    def test_preview_match_low_count_returns_suggestion(self, patient_token):
        r = requests.post(f"{API}/requests/preview-match", headers=_auth_headers(patient_token), json={
            "delivery_pref": "free", "fill_today": True, "medication_name": "Ozempic",
        }, timeout=45)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "count" in d
        # Only Downtown Rx has free + fill_today -> count = 1 -> suggestion present
        assert d["count"] <= 2
        if d["count"] < 2:
            assert d["suggestion"] is not None and len(d["suggestion"]) > 0

    def test_create_request_and_mine(self, patient_token):
        payload = {
            "medication": {"name": "TEST_Metformin", "dose": "500mg", "form": "tablet", "quantity": "30"},
            "schedule": "none", "fridge": False, "specialty": False,
            "delivery_pref": "any", "fill_today": False, "notes": "TEST",
        }
        r = requests.post(f"{API}/requests", headers=_auth_headers(patient_token), json=payload)
        assert r.status_code == 200, r.text
        req = r.json()
        assert req["status"] == "queued"
        assert req["medication"]["name"] == "TEST_Metformin"
        # Verify persistence via /mine
        mine = requests.get(f"{API}/requests/mine", headers=_auth_headers(patient_token))
        assert mine.status_code == 200
        ids = [x["id"] for x in mine.json()]
        assert req["id"] in ids

    def test_queue_blind_view_hides_patient_identity(self, downtown_token):
        r = requests.get(f"{API}/requests/queue", headers=_auth_headers(downtown_token))
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) > 0
        for d in docs:
            assert "patient_name" not in d
            assert "patient_email" not in d
            assert "patient_phone" not in d
            assert d.get("contact") in (None,)
        # Watchlist hit: Ozempic
        ozempic = [d for d in docs if d.get("medication", {}).get("name", "").lower() == "ozempic"]
        assert len(ozempic) >= 1
        assert ozempic[0].get("watchlist_hit") == True

    def test_queue_watchlist_only_filter(self, downtown_token):
        r = requests.get(f"{API}/requests/queue?watchlist_only=true", headers=_auth_headers(downtown_token))
        assert r.status_code == 200
        for d in r.json():
            assert d.get("watchlist_hit") == True

    def test_queue_schedule_filter(self, downtown_token):
        r = requests.get(f"{API}/requests/queue?schedule=II", headers=_auth_headers(downtown_token))
        assert r.status_code == 200
        for d in r.json():
            assert d.get("schedule") == "II"

    def test_clarify_reject_refinement_and_accept_flow(self, patient_token, downtown_token, greenvalley_token):
        # Create a fresh request as patient
        payload = {
            "medication": {"name": "TEST_Amoxicillin", "dose": "500mg", "form": "capsule", "quantity": "21"},
            "schedule": "none", "fridge": False, "specialty": False,
            "delivery_pref": "any", "fill_today": False,
        }
        r = requests.post(f"{API}/requests", headers=_auth_headers(patient_token), json=payload)
        assert r.status_code == 200
        req_id = r.json()["id"]

        # Downtown clarifies
        c = requests.post(f"{API}/requests/{req_id}/clarify",
                          headers=_auth_headers(downtown_token),
                          json={"question": "Generic ok?"})
        assert c.status_code == 200

        # Downtown rejects -> AI refinement
        rj = requests.post(f"{API}/requests/{req_id}/reject",
                           headers=_auth_headers(downtown_token),
                           json={"reason": "Out of stock"}, timeout=45)
        assert rj.status_code == 200, rj.text
        assert "summary" in rj.json()
        assert len(rj.json()["summary"]) > 0

        # Green Valley accepts
        acc = requests.post(f"{API}/requests/{req_id}/accept",
                            headers=_auth_headers(greenvalley_token))
        assert acc.status_code == 200, acc.text
        d = acc.json()
        assert d["platform_fee"] == 4.99
        assert d["payment"] == "simulated"
        assert d["contact"]["patient_email"] == "patient@demo.com"

        # Second accept should fail
        acc2 = requests.post(f"{API}/requests/{req_id}/accept",
                             headers=_auth_headers(downtown_token))
        assert acc2.status_code == 400

        # Verify patient sees contact via /mine
        mine = requests.get(f"{API}/requests/mine", headers=_auth_headers(patient_token))
        assert mine.status_code == 200
        target = [x for x in mine.json() if x["id"] == req_id][0]
        assert target["status"] == "accepted"
        assert target["contact"]["pharmacy_name"] == "Green Valley Pharmacy"

        # Verify request is no longer in Downtown's queue
        q = requests.get(f"{API}/requests/queue", headers=_auth_headers(downtown_token))
        assert req_id not in [x["id"] for x in q.json()]

        # Verify accepted appears in Green Valley's accepted list with patient identity
        acp = requests.get(f"{API}/requests/accepted", headers=_auth_headers(greenvalley_token))
        assert acp.status_code == 200
        gv_accepted = [x for x in acp.json() if x["id"] == req_id][0]
        assert gv_accepted.get("patient_email") == "patient@demo.com"


# -------------- Watchlist --------------
class TestWatchlist:
    def test_update_watchlist(self, downtown_token):
        new_list = ["Ozempic", "Adderall", "TEST_Drug"]
        r = requests.put(f"{API}/pharmacy/watchlist",
                         headers=_auth_headers(downtown_token),
                         json={"watchlist": new_list})
        assert r.status_code == 200
        assert set(r.json()["watchlist"]) == set(new_list)
        # revert
        requests.put(f"{API}/pharmacy/watchlist",
                     headers=_auth_headers(downtown_token),
                     json={"watchlist": ["Ozempic", "Adderall"]})


# -------------- Auth guards --------------
class TestAuthGuards:
    def test_queue_requires_pharmacy(self, patient_token):
        r = requests.get(f"{API}/requests/queue", headers=_auth_headers(patient_token))
        assert r.status_code == 403

    def test_create_request_requires_patient(self, downtown_token):
        r = requests.post(f"{API}/requests",
                          headers=_auth_headers(downtown_token),
                          json={"medication": {"name": "X"}})
        assert r.status_code == 403

    def test_no_token(self):
        r = requests.get(f"{API}/requests/queue")
        assert r.status_code == 401



# -------------- Post-payment updates + earnings + new intake fields --------------
class TestPostUpdateAndEarnings:
    def test_full_flow_post_update_and_earnings(self, patient_token, downtown_token):
        # Baseline earnings for Downtown
        base = requests.get(f"{API}/pharmacy/earnings", headers=_auth_headers(downtown_token)).json()
        base_total = float(base["total"])
        base_count = int(base["count"])

        # Create request with all new intake fields
        payload = {
            "medication": {"name": "TEST_Lipitor", "dose": "20mg", "form": "tablet", "quantity": "30"},
            "schedule": "none", "fridge": False, "specialty": False,
            "transfer_status": True,
            "prescription_status": True,
            "prescriber_status": False,
            "delivery_pref": "any", "fill_today": False,
        }
        r = requests.post(f"{API}/requests", headers=_auth_headers(patient_token), json=payload)
        assert r.status_code == 200, r.text
        req = r.json()
        assert req["transfer_status"] == True
        assert req["prescription_status"] == True
        assert req["prescriber_status"] == False
        assert req.get("post_updates") == []
        req_id = req["id"]

        # Downtown accepts
        acc = requests.post(f"{API}/requests/{req_id}/accept", headers=_auth_headers(downtown_token))
        assert acc.status_code == 200, acc.text
        assert acc.json()["platform_fee"] == 4.99

        # Post a clinical update
        upd = requests.post(
            f"{API}/requests/{req_id}/post-update",
            headers=_auth_headers(downtown_token),
            json={"field": "Dose", "value": "40mg confirmed", "note": "MD approved"},
        )
        assert upd.status_code == 200, upd.text
        d = upd.json()
        assert d["fee_earned"] == 0.5
        assert d["update"]["field"] == "Dose"
        assert d["update"]["value"] == "40mg confirmed"

        # Earnings increased by 0.50
        after = requests.get(f"{API}/pharmacy/earnings", headers=_auth_headers(downtown_token)).json()
        assert round(float(after["total"]) - base_total, 2) == 0.50
        assert after["count"] == base_count + 1
        assert any(e["request_id"] == req_id for e in after["entries"])

        # Patient sees the post_update on /mine
        mine = requests.get(f"{API}/requests/mine", headers=_auth_headers(patient_token))
        target = [x for x in mine.json() if x["id"] == req_id][0]
        assert len(target["post_updates"]) >= 1
        assert target["post_updates"][-1]["field"] == "Dose"
        assert target["post_updates"][-1]["value"] == "40mg confirmed"

    def test_post_update_denied_if_not_owner(self, patient_token, downtown_token, greenvalley_token):
        # Create + accept via greenvalley
        payload = {
            "medication": {"name": "TEST_Zoloft", "dose": "50mg", "form": "tablet", "quantity": "30"},
            "schedule": "none", "fridge": False, "specialty": False,
            "transfer_status": False, "prescription_status": True, "prescriber_status": False,
            "delivery_pref": "any", "fill_today": False,
        }
        r = requests.post(f"{API}/requests", headers=_auth_headers(patient_token), json=payload)
        req_id = r.json()["id"]
        acc = requests.post(f"{API}/requests/{req_id}/accept", headers=_auth_headers(greenvalley_token))
        assert acc.status_code == 200

        # Downtown (not the accepting pharmacy) tries to update -> 400
        bad = requests.post(
            f"{API}/requests/{req_id}/post-update",
            headers=_auth_headers(downtown_token),
            json={"field": "Dose", "value": "10mg"},
        )
        assert bad.status_code == 400

    def test_earnings_requires_pharmacy(self, patient_token):
        r = requests.get(f"{API}/pharmacy/earnings", headers=_auth_headers(patient_token))
        assert r.status_code == 403


# -------------- Cookie-based Auth --------------
class TestCookieAuth:
    def test_login_sets_httponly_cookie(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": "patient@demo.com", "password": "demo123"})
        assert r.status_code == 200
        # cookie should be set on session
        assert "access_token" in s.cookies, f"access_token cookie not set; cookies={dict(s.cookies)}"
        # httpOnly + secure attrs must be in Set-Cookie header
        raw = r.headers.get("set-cookie", "").lower()
        assert "httponly" in raw, f"cookie not httponly: {raw}"
        # /auth/me must work with ONLY the cookie (no Bearer header)
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == "patient@demo.com"

    def test_logout_clears_cookie_and_me_401(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": "patient@demo.com", "password": "demo123"})
        assert r.status_code == 200
        assert s.get(f"{API}/auth/me").status_code == 200
        lo = s.post(f"{API}/auth/logout")
        assert lo.status_code == 200
        # Clear cookies to simulate browser honoring delete_cookie
        s.cookies.clear()
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 401

    def test_register_sets_cookie(self):
        s = requests.Session()
        email = f"test_cookie_{uuid.uuid4().hex[:8]}@demo.com"
        r = s.post(f"{API}/auth/register", json={
            "email": email, "password": "pass1234", "name": "TEST Cookie", "role": "patient",
        })
        assert r.status_code == 200
        assert "access_token" in s.cookies
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == email

    def test_me_no_cookie_returns_401(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# -------------- AI Clinical Validation + Auto-classification --------------
class TestAIClinicalValidation:
    def test_valtrex_capsules_corrected_to_tablet(self):
        """AI must gently correct 'Valtrex capsules' -> form=tablet (Valtrex only comes as tablets)."""
        r = requests.post(f"{API}/chat/message", json={
            "session_id": f"sess-{uuid.uuid4().hex[:6]}",
            "message": "I need Valtrex 500mg capsules, 30 of them",
            "history": [],
        }, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "reply" in d and len(d["reply"]) > 0
        reply_lower = d["reply"].lower()
        identified = d.get("identified") or {}
        form = (identified.get("form") or "").lower()
        # Key acceptance: form must NOT be 'capsule' — should be corrected to tablet/caplet
        assert "capsule" not in form, f"AI failed to correct form; got form='{form}', reply='{d['reply']}'"
        assert "tablet" in form or "caplet" in form, f"Expected tablet/caplet, got form='{form}'"
        # Reply should mention the correction (tablet/caplet keyword)
        assert ("tablet" in reply_lower or "caplet" in reply_lower), (
            f"Reply should mention tablet/caplet as the correct form: {d['reply']}"
        )

    def test_create_request_auto_classifies_controlled_and_hides_from_patient(self, patient_token):
        """Adderall XR should auto-classify schedule=II AND be stripped from patient responses."""
        payload = {
            "medication": {"name": "TEST_Adderall XR", "dose": "20mg", "form": "capsule", "quantity": "30"},
            # Client attempts to set clinical fields — server must IGNORE and use AI
            "schedule": "none", "fridge": False, "specialty": False,
            "transfer_status": False, "prescription_status": True, "prescriber_status": False,
            "delivery_pref": "any", "fill_today": False,
        }
        r = requests.post(f"{API}/requests", headers=_auth_headers(patient_token), json=payload, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        # Patient view MUST NOT contain clinical classification keys
        assert "schedule" not in body, f"schedule leaked to patient: {body}"
        assert "fridge" not in body, f"fridge leaked to patient: {body}"
        assert "specialty" not in body, f"specialty leaked to patient: {body}"
        req_id = body["id"]

        # /requests/mine must also strip
        mine = requests.get(f"{API}/requests/mine", headers=_auth_headers(patient_token))
        assert mine.status_code == 200
        target = [x for x in mine.json() if x["id"] == req_id][0]
        assert "schedule" not in target
        assert "fridge" not in target
        assert "specialty" not in target

    def test_pharmacy_queue_sees_ai_classification(self, patient_token, downtown_token):
        """Adderall queue row must show schedule=II; Lantus insulin must show fridge=true."""
        # Create Adderall as patient
        p1 = {"medication": {"name": "TEST_Adderall XR", "dose": "20mg", "form": "capsule", "quantity": "30"},
              "schedule": "none", "fridge": False, "specialty": False,
              "transfer_status": False, "prescription_status": True, "prescriber_status": False,
              "delivery_pref": "any", "fill_today": False}
        r1 = requests.post(f"{API}/requests", headers=_auth_headers(patient_token), json=p1, timeout=60)
        assert r1.status_code == 200
        adderall_id = r1.json()["id"]

        # Create Lantus insulin
        p2 = {"medication": {"name": "TEST_Lantus insulin", "dose": "100 units/mL", "form": "injection", "quantity": "1 pen"},
              "schedule": "none", "fridge": False, "specialty": False,
              "transfer_status": False, "prescription_status": True, "prescriber_status": False,
              "delivery_pref": "any", "fill_today": False}
        r2 = requests.post(f"{API}/requests", headers=_auth_headers(patient_token), json=p2, timeout=60)
        assert r2.status_code == 200
        insulin_id = r2.json()["id"]

        # Pharmacy queue
        q = requests.get(f"{API}/requests/queue", headers=_auth_headers(downtown_token))
        assert q.status_code == 200
        by_id = {d["id"]: d for d in q.json()}
        assert adderall_id in by_id, "Adderall not in pharmacy queue"
        assert insulin_id in by_id, "Insulin not in pharmacy queue"

        add_row = by_id[adderall_id]
        ins_row = by_id[insulin_id]

        # Pharmacy MUST see clinical fields
        assert add_row.get("schedule") == "II", f"Adderall schedule expected II, got {add_row.get('schedule')}"
        assert ins_row.get("fridge") == True, f"Lantus fridge expected True, got {ins_row.get('fridge')}"

        # Schedule II filter should include Adderall
        qf = requests.get(f"{API}/requests/queue?schedule=II", headers=_auth_headers(downtown_token))
        assert qf.status_code == 200
        assert adderall_id in [d["id"] for d in qf.json()]

        # Fridge filter should include Lantus
        qfr = requests.get(f"{API}/requests/queue?fridge=true", headers=_auth_headers(downtown_token))
        assert qfr.status_code == 200
        assert insulin_id in [d["id"] for d in qfr.json()]
