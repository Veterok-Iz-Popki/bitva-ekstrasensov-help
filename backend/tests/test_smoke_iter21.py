"""Iteration 21 smoke tests after pod restart / DB restore."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://psychic-battle-2.preview.emergentagent.com").rstrip("/")
ADMIN_USER = "nikoa2020@gmail.com"
ADMIN_PASS = "aspire5542gl1952tq"
EXPECTED_POPUP_PHONE = "+7 911 555-66-66"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/admin/login",
                      json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("token")
    assert tok and len(tok) > 20
    return tok


# ---- Public smoke ----
class TestPublicSmoke:
    def test_home_html_200(self):
        r = requests.get(f"{BASE_URL}/", timeout=15)
        assert r.status_code == 200
        assert "Битва" in r.text or "битва" in r.text.lower() or "<div id=\"root\"" in r.text

    def test_topic_page(self):
        r = requests.get(f"{BASE_URL}/api/pages/topic-porcha", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("page_slug") == "topic-porcha"
        assert "blocks" in data and isinstance(data["blocks"], dict) and len(data["blocks"]) > 0

    def test_participants_count_8(self):
        r = requests.get(f"{BASE_URL}/api/participants", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 8, f"expected 8 participants, got {len(data)}"

    def test_reviews_count_40(self):
        r = requests.get(f"{BASE_URL}/api/reviews", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 40, f"expected 40 reviews (5×8 random), got {len(data)}"

    def test_settings_popup_phone(self):
        r = requests.get(f"{BASE_URL}/api/settings", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("popup_phone") == EXPECTED_POPUP_PHONE

    def test_vcard_contains_phone(self):
        r = requests.get(f"{BASE_URL}/api/contact.vcf", timeout=15)
        assert r.status_code == 200
        # Phone in vCard is stripped to digits/+
        assert "TEL" in r.text
        assert "+79115556666" in r.text

    def test_participant_page_route(self):
        r = requests.get(f"{BASE_URL}/uchastniki/elena-golunova", timeout=15)
        assert r.status_code == 200


# ---- Applications: validation + NO persistence ----
class TestApplications:
    def test_validation_missing_lastname(self):
        r = requests.post(f"{BASE_URL}/api/applications",
                          json={"phone": "+79991234567"}, timeout=15)
        assert r.status_code == 400
        assert "фамилию" in r.json().get("detail", "")

    def test_submit_success_but_not_persisted(self, admin_token):
        # baseline
        before = requests.get(f"{BASE_URL}/api/admin/applications",
                              headers={"Authorization": f"Bearer {admin_token}"}, timeout=15).json()
        before_count = len(before)

        payload = {
            "lastName": "TEST_Фамилия",
            "firstName": "Иван",
            "patronymic": "Иванович",
            "phone": "+79991234567",
            "problem": "автотест iter21"
        }
        r = requests.post(f"{BASE_URL}/api/applications", json=payload, timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "success"

        after = requests.get(f"{BASE_URL}/api/admin/applications",
                             headers={"Authorization": f"Bearer {admin_token}"}, timeout=15).json()
        after_count = len(after)
        assert after_count == before_count, \
            f"Applications must NOT be persisted to DB. before={before_count} after={after_count}"


# ---- Admin ----
class TestAdmin:
    def test_admin_login(self, admin_token):
        assert admin_token

    def test_admin_dashboard_zero_apps(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/applications",
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 0, f"expected 0 applications, got {len(data)}"

    def test_admin_requires_token(self):
        r = requests.get(f"{BASE_URL}/api/admin/applications", timeout=15)
        assert r.status_code in (401, 403)
