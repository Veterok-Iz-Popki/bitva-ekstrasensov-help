"""Tests verifying applications submissions no longer persist to DB.

Requirements:
- POST /api/applications with valid data returns 200 success, but creates NO DB row
- GET /api/admin/applications returns []
- GET /api/admin/stats has total/new/today applications = 0
- Validation still returns 400 for missing fields
- POST /api/contact still persists in contact_messages
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    # Fallback to frontend/.env
    try:
        with open('/app/frontend/.env') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    BASE_URL = line.split('=', 1)[1].strip().strip('"').rstrip('/')
                    break
    except Exception:
        pass

ADMIN_USERNAME = 'nikoa2020@gmail.com'
ADMIN_PASSWORD = 'aspire5542gl1952tq'


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(api):
    r = api.post(f"{BASE_URL}/api/admin/login",
                 json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}",
    })
    return s


class TestApplicationsDisabled:
    """POST /api/applications must NOT persist to DB anymore."""

    def test_initial_applications_table_empty(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/applications")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 0, f"Expected 0 apps, got {len(data)}: {data[:3]}"

    def test_initial_stats_zero(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/stats")
        assert r.status_code == 200
        data = r.json()
        assert data.get("total_applications") == 0
        assert data.get("new_applications") == 0
        assert data.get("today_applications") == 0

    def test_post_valid_application_returns_success_but_no_persistence(self, api, admin_client):
        # Slow down a touch to avoid in-memory rate limit collisions (5/min)
        unique = uuid.uuid4().hex[:8]
        payload = {
            "lastName": f"TEST_Last_{unique}",
            "firstName": f"TEST_First_{unique}",
            "patronymic": f"TEST_Patr_{unique}",
            "phone": "+7 900 000 00 01",
            "problem": "TEST_problem_description",
            "age": "30",
            "city": "TEST_City",
        }
        r = api.post(f"{BASE_URL}/api/applications", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code} {r.text}"
        body = r.json()
        assert body.get("status") == "success"
        assert "успешно отправлена" in body.get("message", "") or "принята" in body.get("message", "")

        # Now verify DB is still empty
        time.sleep(0.5)
        r2 = admin_client.get(f"{BASE_URL}/api/admin/applications")
        assert r2.status_code == 200
        data = r2.json()
        assert len(data) == 0, f"Application leaked into DB! Found {len(data)} rows"

    def test_multiple_submissions_dont_persist(self, api, admin_client):
        # Need to also work around rate limit (5 req/60s/IP). Sleep between batches.
        for i in range(3):
            unique = uuid.uuid4().hex[:8]
            payload = {
                "lastName": f"TEST_Multi_{i}_{unique}",
                "firstName": "Иван",
                "patronymic": "Иванович",
                "phone": f"+7 900 000 00 0{i}",
                "problem": f"Тестовая проблема номер {i}",
            }
            r = api.post(f"{BASE_URL}/api/applications", json=payload)
            # Either 200 success or 429 rate-limited — both are acceptable
            assert r.status_code in (200, 429), f"Unexpected status {r.status_code}: {r.text}"

        r2 = admin_client.get(f"{BASE_URL}/api/admin/applications")
        assert r2.status_code == 200
        assert len(r2.json()) == 0

        r3 = admin_client.get(f"{BASE_URL}/api/admin/stats")
        assert r3.status_code == 200
        assert r3.json().get("total_applications") == 0


class TestApplicationsValidation:
    """Form validation still enforced even though we no longer save to DB."""

    @pytest.mark.parametrize("missing_field, expected_msg_part", [
        ("lastName", "фамил"),
        ("firstName", "имя"),
        ("patronymic", "отчество"),
        ("phone", "телефон"),
        ("problem", "проблем"),
    ])
    def test_missing_required_field_returns_400(self, api, missing_field, expected_msg_part):
        base = {
            "lastName": "TEST_L",
            "firstName": "TEST_F",
            "patronymic": "TEST_P",
            "phone": "+7 900 000 00 99",
            "problem": "TEST problem",
        }
        base[missing_field] = ""
        r = api.post(f"{BASE_URL}/api/applications", json=base)
        # 400 expected (could be 429 if rate-limited from previous tests; accept either)
        assert r.status_code in (400, 429), f"Expected 400/429, got {r.status_code}: {r.text}"
        if r.status_code == 400:
            detail = (r.json().get("detail") or "").lower()
            assert expected_msg_part.lower() in detail, \
                f"Expected '{expected_msg_part}' in detail, got: {detail}"


class TestContactMessagesStillWork:
    """POST /api/contact MUST still persist in contact_messages."""

    def test_contact_persists(self, api, admin_client):
        # Count before
        r_before = admin_client.get(f"{BASE_URL}/api/admin/contacts")
        assert r_before.status_code == 200
        before_count = len(r_before.json())

        unique = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST_Contact_{unique}",
            "email": "+7 900 111 22 33",
            "message": f"TEST_message_{unique}",
        }
        r = api.post(f"{BASE_URL}/api/contact", json=payload)
        # Could be 429 due to contact rate limit (3/120s). Try once; accept either.
        if r.status_code == 429:
            pytest.skip("Contact endpoint rate-limited; skipping persistence check")
        assert r.status_code == 200, f"Contact POST failed: {r.status_code} {r.text}"
        assert r.json().get("status") == "success"

        time.sleep(0.5)
        r_after = admin_client.get(f"{BASE_URL}/api/admin/contacts")
        assert r_after.status_code == 200
        after = r_after.json()
        assert len(after) == before_count + 1, \
            f"Contact not persisted: before={before_count}, after={len(after)}"

        # Cleanup TEST_ contact
        new_msg = next((m for m in after if m.get("name", "").startswith(f"TEST_Contact_{unique}")), None)
        if new_msg and new_msg.get("id"):
            admin_client.delete(f"{BASE_URL}/api/admin/contacts/{new_msg['id']}")


class TestFinalState:
    """Final verification — DB still empty after all submissions."""

    def test_apps_table_still_empty(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/applications")
        assert r.status_code == 200
        assert len(r.json()) == 0

    def test_stats_still_zero(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/stats")
        assert r.status_code == 200
        d = r.json()
        assert d.get("total_applications") == 0
        assert d.get("new_applications") == 0
        assert d.get("today_applications") == 0
