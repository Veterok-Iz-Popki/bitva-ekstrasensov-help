"""
Test suite for Node.js Express + MariaDB backend
Verifies all API endpoints after migration from Python FastAPI + MongoDB
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "nikoa2020@gmail.com"
ADMIN_PASSWORD = "aspire5542gl1952tq"


class TestPublicEndpoints:
    """Tests for public API endpoints"""

    def test_api_root_returns_message(self):
        """GET /api/ returns API message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Битва экстрасенсов" in data["message"]
        print(f"✓ API root returns: {data['message']}")

    def test_participants_returns_list(self):
        """GET /api/participants returns 8 participants"""
        response = requests.get(f"{BASE_URL}/api/participants")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 8, f"Expected 8 participants, got {len(data)}"
        print(f"✓ Got {len(data)} participants")
        
        # Verify participant structure
        participant = data[0]
        required_fields = ["id", "slug", "name", "title", "description", "photo_url", "specializations"]
        for field in required_fields:
            assert field in participant, f"Missing field: {field}"
        
        # Check specializations is parsed as array
        assert isinstance(participant["specializations"], list), "specializations should be array"
        print(f"✓ First participant: {participant['name']} with {len(participant['specializations'])} specializations")

    def test_participant_by_slug(self):
        """GET /api/participants/:slug returns single participant"""
        # First get list to get a valid slug
        response = requests.get(f"{BASE_URL}/api/participants")
        participants = response.json()
        slug = participants[0]["slug"]
        
        # Get by slug
        response = requests.get(f"{BASE_URL}/api/participants/{slug}")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == slug
        assert "name" in data
        assert "full_description" in data
        print(f"✓ Got participant by slug: {data['name']}")

    def test_participant_not_found(self):
        """GET /api/participants/:slug returns 404 for unknown slug"""
        response = requests.get(f"{BASE_URL}/api/participants/non-existent-slug-12345")
        assert response.status_code == 404
        print("✓ Returns 404 for non-existent participant")

    def test_reviews_with_limit(self):
        """GET /api/reviews?limit=5 returns reviews with participant_name"""
        response = requests.get(f"{BASE_URL}/api/reviews?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5
        
        # Check review structure
        if len(data) > 0:
            review = data[0]
            required_fields = ["id", "author_name", "text", "rating", "is_published"]
            for field in required_fields:
                assert field in review, f"Missing field: {field}"
            
            # Check participant_name enrichment
            assert "participant_name" in review, "participant_name enrichment missing"
            print(f"✓ Got {len(data)} reviews, first has participant_name: {review.get('participant_name')}")

    def test_participant_reviews(self):
        """GET /api/participants/:slug/reviews returns reviews for participant"""
        # Get a participant slug
        response = requests.get(f"{BASE_URL}/api/participants")
        slug = response.json()[0]["slug"]
        
        response = requests.get(f"{BASE_URL}/api/participants/{slug}/reviews")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All reviews should be for this participant
        for review in data:
            assert review["participant_slug"] == slug
        print(f"✓ Got {len(data)} reviews for participant {slug}")

    def test_faq_returns_list(self):
        """GET /api/faq returns FAQ items"""
        response = requests.get(f"{BASE_URL}/api/faq")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        faq = data[0]
        assert "question" in faq
        assert "answer" in faq
        print(f"✓ Got {len(data)} FAQ items")

    def test_pages_home(self):
        """GET /api/pages/home returns home page with blocks"""
        response = requests.get(f"{BASE_URL}/api/pages/home")
        assert response.status_code == 200
        data = response.json()
        assert "page_slug" in data
        assert data["page_slug"] == "home"
        assert "blocks" in data
        print(f"✓ Got home page with blocks: {list(data['blocks'].keys()) if data['blocks'] else 'empty'}")

    def test_pages_topic(self):
        """GET /api/pages/topic-porcha returns topic page with blocks"""
        response = requests.get(f"{BASE_URL}/api/pages/topic-porcha")
        assert response.status_code == 200
        data = response.json()
        assert "page_slug" in data
        assert "blocks" in data
        # Check blocks is parsed as dict
        assert isinstance(data["blocks"], dict)
        print(f"✓ Got topic-porcha page with blocks: {list(data['blocks'].keys()) if data['blocks'] else 'empty'}")

    def test_seo_home(self):
        """GET /api/seo/home returns SEO settings"""
        response = requests.get(f"{BASE_URL}/api/seo/home")
        assert response.status_code == 200
        data = response.json()
        assert "page_slug" in data
        seo_fields = ["title", "description", "keywords", "h1"]
        for field in seo_fields:
            assert field in data, f"Missing SEO field: {field}"
        print(f"✓ Got SEO for home: title='{data.get('title', '')[:50]}...'")

    def test_settings_returns_data(self):
        """GET /api/settings returns site settings"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        data = response.json()
        expected_fields = ["email", "phone", "working_hours", "copyright_text"]
        for field in expected_fields:
            assert field in data, f"Missing settings field: {field}"
        print(f"✓ Got site settings: phone={data.get('phone')}")

    def test_gallery_photos(self):
        """GET /api/gallery/photos returns gallery photos"""
        response = requests.get(f"{BASE_URL}/api/gallery/photos")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} gallery photos")

    def test_gallery_videos(self):
        """GET /api/gallery/videos returns gallery videos"""
        response = requests.get(f"{BASE_URL}/api/gallery/videos")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} gallery videos")


class TestAdminAuth:
    """Tests for admin authentication"""

    def test_admin_login_success(self):
        """POST /api/admin/login with correct credentials returns JWT token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data, "Token missing from login response"
        assert "username" in data
        assert data["username"] == ADMIN_EMAIL
        assert len(data["token"]) > 20  # JWT should be long
        print(f"✓ Admin login successful, got token")

    def test_admin_login_wrong_password(self):
        """POST /api/admin/login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": "wrongpassword123"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"✓ Wrong password returns 401: {data['detail']}")

    def test_admin_login_unknown_user(self):
        """POST /api/admin/login with unknown user returns 401"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "unknown@example.com",
            "password": "anypassword"
        })
        assert response.status_code == 401
        print("✓ Unknown user returns 401")


class TestAdminProtectedEndpoints:
    """Tests for admin-protected endpoints"""

    @pytest.fixture
    def auth_token(self):
        """Get valid auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]

    def test_admin_me_with_token(self, auth_token):
        """GET /api/admin/me with valid token returns username"""
        response = requests.get(f"{BASE_URL}/api/admin/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "username" in data
        assert data["username"] == ADMIN_EMAIL
        print(f"✓ /admin/me returns: {data['username']}")

    def test_admin_me_without_token(self):
        """GET /api/admin/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/me")
        assert response.status_code == 401
        print("✓ /admin/me without token returns 401")

    def test_admin_applications_list(self, auth_token):
        """GET /api/admin/applications with auth returns applications list"""
        response = requests.get(f"{BASE_URL}/api/admin/applications", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} applications")

    def test_admin_stats(self, auth_token):
        """GET /api/admin/stats with auth returns stats object"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        expected_fields = ["total_applications", "new_applications", "today_applications", 
                         "total_participants", "total_reviews", "total_contacts"]
        for field in expected_fields:
            assert field in data, f"Missing stats field: {field}"
        print(f"✓ Got stats: {data['total_participants']} participants, {data['total_reviews']} reviews")


class TestApplicationSubmission:
    """Tests for form submission"""

    def test_submit_application(self):
        """POST /api/applications submits form and creates application"""
        response = requests.post(f"{BASE_URL}/api/applications", json={
            "lastName": "TEST_Тестов",
            "firstName": "TEST_Тест",
            "patronymic": "TEST_Тестович",
            "phone": "+7 999 123-45-67",
            "age": "35",
            "city": "Москва",
            "problem": "Тестовая заявка для проверки API"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        assert "message" in data
        print(f"✓ Application submitted: {data['message']}")

    def test_submit_application_validation_error(self):
        """POST /api/applications validates required fields"""
        # Missing lastName
        response = requests.post(f"{BASE_URL}/api/applications", json={
            "firstName": "Test",
            "patronymic": "Test",
            "phone": "+7 999 123-45-67",
            "problem": "Test problem"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✓ Validation error: {data['detail']}")

    def test_submit_application_honeypot(self):
        """POST /api/applications with honeypot returns success but doesn't save"""
        response = requests.post(f"{BASE_URL}/api/applications", json={
            "lastName": "Bot",
            "firstName": "Bot",
            "patronymic": "Bot",
            "phone": "+7 999 000-00-00",
            "problem": "Bot submission",
            "honeypot": "spam_content"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        print("✓ Honeypot submission handled gracefully")


class TestBooleanFieldHandling:
    """Tests for boolean fields (MariaDB returns 0/1 instead of true/false)"""

    def test_participant_is_active_field(self):
        """Verify is_active field is properly returned"""
        response = requests.get(f"{BASE_URL}/api/participants")
        data = response.json()
        if len(data) > 0:
            is_active = data[0].get("is_active")
            # MariaDB returns 0/1, frontend should handle both
            assert is_active in [0, 1, True, False], f"is_active should be boolean-like, got {is_active}"
            print(f"✓ is_active field returned as: {is_active} (type: {type(is_active).__name__})")

    def test_review_is_published_field(self):
        """Verify is_published field is properly returned"""
        response = requests.get(f"{BASE_URL}/api/reviews?limit=1")
        data = response.json()
        if len(data) > 0:
            is_published = data[0].get("is_published")
            assert is_published in [0, 1, True, False], f"is_published should be boolean-like, got {is_published}"
            print(f"✓ is_published field returned as: {is_published} (type: {type(is_published).__name__})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
