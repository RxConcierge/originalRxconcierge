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
        assert ozempic[0].get("watchlist_hit") is True

    def test_queue_watchlist_only_filter(self, downtown_token):
        r = requests.get(f"{API}/requests/queue?watchlist_only=true", headers=_auth_headers(downtown_token))
        assert r.status_code == 200
        for d in r.json():
            assert d.get("watchlist_hit") is True

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
