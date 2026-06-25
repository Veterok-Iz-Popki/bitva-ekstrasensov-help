"""End-to-end tests for popup_phone (site_settings) used by:
- ApplicationForm success popup (/zapis-na-priem)
- vCard endpoint /api/contact.vcf (iPhone "Save Contact")
- Admin settings (/api/admin/settings)
"""
import os
import time
import re
import pytest
import requests


def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if url:
        return url.rstrip("/")
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL is not set")


BASE_URL = _load_backend_url()
ADMIN_USERNAME = "nikoa2020@gmail.com"
ADMIN_PASSWORD = "aspire5542gl1952tq"
DEFAULT_POPUP_PHONE = "+7 928 421-73-58"
TEST_PHONE = "+7 911 555-77-88"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/admin/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def initial_settings(auth_headers):
    """Снимок настроек до тестов, нужен чтобы PUT не затёр остальные поля."""
    r = requests.get(f"{BASE_URL}/api/admin/settings", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    return r.json()


def _put_popup_phone(auth_headers, base, phone):
    payload = {**base, "popup_phone": phone}
    r = requests.put(
        f"{BASE_URL}/api/admin/settings",
        headers=auth_headers,
        json=payload,
        timeout=15,
    )
    assert r.status_code == 200, r.text
    return r.json()


class TestSettingsPublic:
    def test_get_settings_returns_popup_phone_field(self):
        r = requests.get(f"{BASE_URL}/api/settings", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "popup_phone" in data, "GET /api/settings must expose popup_phone"
        assert isinstance(data["popup_phone"], str)


class TestPopupPhoneFlow:
    def test_admin_update_popup_phone_persists_and_public_reflects(self, auth_headers, initial_settings):
        # 1. Set popup_phone to test value
        updated = _put_popup_phone(auth_headers, initial_settings, TEST_PHONE)
        assert updated["popup_phone"] == TEST_PHONE

        # 2. Public GET reflects new value
        r_pub = requests.get(f"{BASE_URL}/api/settings", timeout=15)
        assert r_pub.status_code == 200
        assert r_pub.json()["popup_phone"] == TEST_PHONE

    def test_vcard_endpoint_uses_popup_phone(self, auth_headers, initial_settings):
        _put_popup_phone(auth_headers, initial_settings, TEST_PHONE)
        r = requests.get(f"{BASE_URL}/api/contact.vcf", timeout=15)
        assert r.status_code == 200
        ct = r.headers.get("Content-Type", "")
        assert "vcard" in ct.lower(), f"unexpected Content-Type {ct}"
        body = r.text
        # vCard digit form must match popup_phone digits
        expected_digits = re.sub(r"[^+\d]", "", TEST_PHONE)
        assert f"TEL;TYPE=CELL:{expected_digits}" in body, body

    def test_empty_popup_phone_vcard_falls_back_to_default(self, auth_headers, initial_settings):
        # Clear popup_phone
        _put_popup_phone(auth_headers, initial_settings, "")

        # Public GET — empty string is expected
        r_pub = requests.get(f"{BASE_URL}/api/settings", timeout=15)
        assert r_pub.status_code == 200
        assert r_pub.json()["popup_phone"] == ""

        # vCard endpoint must fall back to DEFAULT (server.js DEFAULT_VCARD_PHONE)
        r = requests.get(f"{BASE_URL}/api/contact.vcf", timeout=15)
        assert r.status_code == 200
        expected_digits = re.sub(r"[^+\d]", "", DEFAULT_POPUP_PHONE)
        assert f"TEL;TYPE=CELL:{expected_digits}" in r.text, r.text

    def test_restore_test_value(self, auth_headers, initial_settings):
        # Restore so manual UI testing keeps using the documented value
        updated = _put_popup_phone(auth_headers, initial_settings, TEST_PHONE)
        assert updated["popup_phone"] == TEST_PHONE


class TestApplicationsEndpoint:
    """POST /api/applications: смотрим что endpoint отвечает 200 (popup открывается),
    и что заявки не сохраняются в БД (по предыдущему требованию)."""

    def test_applications_post_returns_success(self, auth_headers):
        # Get current admin applications count BEFORE
        r0 = requests.get(f"{BASE_URL}/api/admin/applications", headers=auth_headers, timeout=15)
        assert r0.status_code == 200
        count_before = len(r0.json())

        payload = {
            "lastName": "TEST_Ivanov",
            "firstName": "Иван",
            "patronymic": "Иванович",
            "phone": "+7 (999) 555-44-33",
            "age": "30",
            "city": "Москва",
            "problem": "TEST_popup_phone_e2e",
            "honeypot": "",
        }
        # Sleep briefly to avoid rate-limit collisions with other tests (5/60s).
        time.sleep(1)
        r = requests.post(f"{BASE_URL}/api/applications", json=payload, timeout=15)
        # Even if rate-limited (429) — popup logic on FE only depends on 2xx
        if r.status_code == 429:
            pytest.skip("Rate limit hit on /api/applications during testing")
        assert r.status_code in (200, 201), f"{r.status_code} {r.text}"

        # Verify NOT persisted to admin/applications (per saved requirement)
        r1 = requests.get(f"{BASE_URL}/api/admin/applications", headers=auth_headers, timeout=15)
        assert r1.status_code == 200
        count_after = len(r1.json())
        assert count_after == count_before, (
            f"Applications должны быть disabled: было {count_before}, стало {count_after}"
        )
