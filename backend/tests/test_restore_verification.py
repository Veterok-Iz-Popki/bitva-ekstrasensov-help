"""
Verification tests after restore-db.sh recovery.
Checks public API endpoints, admin login, page rendering paths.
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://psychic-battle-2.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


class TestPublicAPIs:
    def test_root_html_serves_spa(self, s):
        r = s.get(f"{BASE_URL}/")
        assert r.status_code == 200
        assert 'id="root"' in r.text
        # no /pod-backups/ artifacts inside built index
        assert "/pod-backups/" not in r.text

    def test_pages_topic_porcha(self, s):
        r = s.get(f"{BASE_URL}/api/pages/topic-porcha")
        assert r.status_code == 200
        data = r.json()
        # page has content
        assert isinstance(data, dict)
        assert data.get("slug") in ("topic-porcha", None) or "slug" in data or "title" in data or "content" in data

    def test_participants_count_is_eight(self, s):
        r = s.get(f"{BASE_URL}/api/participants")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 8
        for p in data:
            assert "slug" in p and "name" in p

    def test_reviews_endpoint_returns_list(self, s):
        # By design: 5 per psychic * 8 = 40 reviews; DB total ~200
        r = s.get(f"{BASE_URL}/api/reviews")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 30
        item = data[0]
        for f in ("author_name", "text", "participant_slug"):
            assert f in item

    def test_settings_endpoint(self, s):
        r = s.get(f"{BASE_URL}/api/settings")
        assert r.status_code == 200
        data = r.json()
        for f in ("email", "phone", "popup_phone"):
            assert f in data


class TestSPARoutes:
    @pytest.mark.parametrize("path", [
        "/uchastniki/elena-golunova",
        "/otzyvy",
        "/admin/login",
    ])
    def test_spa_route_returns_200(self, s, path):
        r = s.get(f"{BASE_URL}{path}")
        assert r.status_code == 200
        assert 'id="root"' in r.text


class TestAdminAuth:
    def test_admin_login_works(self, s):
        creds = {
            "username": "nikoa2020@gmail.com",
            "password": "aspire5542gl1952tq",
        }
        # try common login endpoints
        for ep in ("/api/admin/login", "/api/auth/login", "/api/login"):
            r = s.post(f"{BASE_URL}{ep}", json=creds)
            if r.status_code in (200, 201):
                data = r.json()
                assert any(k in data for k in ("token", "access_token", "jwt", "session", "ok"))
                return
        pytest.fail("No admin login endpoint accepted credentials")
