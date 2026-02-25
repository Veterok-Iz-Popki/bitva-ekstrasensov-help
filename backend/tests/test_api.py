"""
Backend API Tests for Битва экстрасенсов Website
Tests public and admin endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPublicEndpoints:
    """Tests for public API endpoints"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: API root - {data['message']}")
    
    def test_get_participants(self):
        """Test getting participants list"""
        response = requests.get(f"{BASE_URL}/api/participants")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify data structure
        participant = data[0]
        assert "id" in participant
        assert "name" in participant
        assert "slug" in participant
        print(f"SUCCESS: Got {len(data)} participants")
    
    def test_get_participant_by_slug(self):
        """Test getting single participant by slug"""
        response = requests.get(f"{BASE_URL}/api/participants/marina-svetlova")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Марина Светлова"
        assert "description" in data
        assert "photo_url" in data
        print(f"SUCCESS: Got participant - {data['name']}")
    
    def test_get_participant_not_found(self):
        """Test 404 for non-existent participant"""
        response = requests.get(f"{BASE_URL}/api/participants/non-existent-slug")
        assert response.status_code == 404
        print("SUCCESS: 404 for non-existent participant")
    
    def test_get_reviews(self):
        """Test getting reviews list"""
        response = requests.get(f"{BASE_URL}/api/reviews")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify data structure
        review = data[0]
        assert "author_name" in review
        assert "text" in review
        assert "rating" in review
        print(f"SUCCESS: Got {len(data)} reviews")
    
    def test_get_faq(self):
        """Test getting FAQ items"""
        response = requests.get(f"{BASE_URL}/api/faq")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify data structure
        faq = data[0]
        assert "question" in faq
        assert "answer" in faq
        print(f"SUCCESS: Got {len(data)} FAQ items")
    
    def test_get_settings(self):
        """Test getting site settings"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        data = response.json()
        assert "email" in data or "working_hours" in data
        print(f"SUCCESS: Got site settings")
    
    def test_get_page_home(self):
        """Test getting home page content"""
        response = requests.get(f"{BASE_URL}/api/pages/home")
        assert response.status_code == 200
        data = response.json()
        assert "blocks" in data or "page_slug" in data
        print("SUCCESS: Got home page content")
    
    def test_get_seo_home(self):
        """Test getting SEO settings for home"""
        response = requests.get(f"{BASE_URL}/api/seo/home")
        assert response.status_code == 200
        data = response.json()
        assert "page_slug" in data or "title" in data
        print("SUCCESS: Got home page SEO settings")


class TestFormSubmission:
    """Tests for form submission endpoints"""
    
    def test_create_application_success(self):
        """Test creating application (form submission)"""
        payload = {
            "name": "TEST_Автотест",
            "phone": "+7 (999) 888-77-66",
            "age": "35",
            "city": "Тестовый город",
            "description": "Тестовая заявка для автоматического тестирования",
            "honeypot": ""
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        print("SUCCESS: Application submitted")
    
    def test_create_application_honeypot_blocked(self):
        """Test honeypot blocks spam"""
        payload = {
            "name": "Spam Bot",
            "phone": "+1234567890",
            "honeypot": "spam_value"  # Honeypot filled = spam
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=payload)
        # Should return success (silently blocked)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        print("SUCCESS: Honeypot spam protection working")
    
    def test_create_contact_message(self):
        """Test creating contact message"""
        payload = {
            "name": "TEST_Контакт",
            "email": "test@example.com",
            "message": "Тестовое сообщение для проверки формы обратной связи",
            "honeypot": ""
        }
        response = requests.post(f"{BASE_URL}/api/contact", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        print("SUCCESS: Contact message submitted")


class TestAdminAuth:
    """Tests for admin authentication"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        return data["token"]
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "username" in data
        assert data["username"] == "admin"
        print("SUCCESS: Admin login successful")
    
    def test_admin_login_fail(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "wrong_password"
        })
        assert response.status_code == 401
        print("SUCCESS: Invalid credentials rejected")
    
    def test_admin_me(self, admin_token):
        """Test getting current admin user"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin"
        print("SUCCESS: Admin me endpoint working")


class TestAdminParticipants:
    """Tests for admin participant management"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_admin_participants(self, admin_headers):
        """Test getting all participants in admin"""
        response = requests.get(f"{BASE_URL}/api/admin/participants", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin got {len(data)} participants")


class TestAdminReviews:
    """Tests for admin review management"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_admin_reviews(self, admin_headers):
        """Test getting all reviews in admin"""
        response = requests.get(f"{BASE_URL}/api/admin/reviews", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin got {len(data)} reviews")


class TestAdminFAQ:
    """Tests for admin FAQ management"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_admin_faq(self, admin_headers):
        """Test getting all FAQ items in admin"""
        response = requests.get(f"{BASE_URL}/api/admin/faq", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin got {len(data)} FAQ items")


class TestAdminApplications:
    """Tests for admin application management"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_admin_applications(self, admin_headers):
        """Test getting all applications in admin"""
        response = requests.get(f"{BASE_URL}/api/admin/applications", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin got {len(data)} applications")


class TestAdminStats:
    """Tests for admin dashboard stats"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_admin_stats(self, admin_headers):
        """Test getting dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_applications" in data
        assert "total_participants" in data
        assert "total_reviews" in data
        print(f"SUCCESS: Admin stats - apps: {data['total_applications']}, participants: {data['total_participants']}, reviews: {data['total_reviews']}")


class TestAdminSettings:
    """Tests for admin settings management"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_admin_settings(self, admin_headers):
        """Test getting site settings in admin"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data or "email" in data
        print("SUCCESS: Admin got site settings")


class TestAdminSEO:
    """Tests for admin SEO management"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_admin_seo(self, admin_headers):
        """Test getting all SEO settings in admin"""
        response = requests.get(f"{BASE_URL}/api/admin/seo", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin got {len(data)} SEO settings")


class TestAdminPages:
    """Tests for admin pages management"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_admin_pages(self, admin_headers):
        """Test getting all pages in admin"""
        response = requests.get(f"{BASE_URL}/api/admin/pages", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin got {len(data)} pages")


class TestAdminContacts:
    """Tests for admin contact messages management"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_admin_contacts(self, admin_headers):
        """Test getting all contact messages in admin"""
        response = requests.get(f"{BASE_URL}/api/admin/contacts", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin got {len(data)} contact messages")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
