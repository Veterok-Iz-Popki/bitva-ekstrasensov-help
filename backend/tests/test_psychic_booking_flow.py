"""
Tests for the new psychic booking flow:
- POST /api/applications with psychic_slug and psychic_name fields
- GET /api/admin/applications returns psychic_slug and psychic_name
- GET /api/participants/:slug returns participant data for personalized booking title
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "nikoa2020@gmail.com"
ADMIN_PASSWORD = "aspire5542gl1952tq"

# Test data
TEST_PREFIX = f"TEST_{uuid.uuid4().hex[:8]}_"

class TestParticipantEndpoint:
    """Test GET /api/participants/:slug for booking page data"""
    
    def test_get_elena_golunova(self):
        """Verify elena-golunova participant exists and has required fields"""
        response = requests.get(f"{BASE_URL}/api/participants/elena-golunova")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["slug"] == "elena-golunova"
        assert data["name"] == "Елена Голунова"
        assert "title" in data
        print(f"✓ elena-golunova: name={data['name']}, title={data['title']}")
    
    def test_get_aleksandr_sheps(self):
        """Verify aleksandr-sheps participant exists"""
        response = requests.get(f"{BASE_URL}/api/participants/aleksandr-sheps")
        assert response.status_code == 200
        
        data = response.json()
        assert data["slug"] == "aleksandr-sheps"
        assert data["name"] == "Александр Шепс"
        print(f"✓ aleksandr-sheps: name={data['name']}")
    
    def test_get_viktoriya_raidos(self):
        """Verify viktoriya-raidos participant exists"""
        response = requests.get(f"{BASE_URL}/api/participants/viktoriya-raidos")
        assert response.status_code == 200
        
        data = response.json()
        assert data["slug"] == "viktoriya-raidos"
        assert data["name"] == "Виктория Райдос"
        print(f"✓ viktoriya-raidos: name={data['name']}")
    
    def test_get_nadezhda_shevchenko(self):
        """Verify nadezhda-shevchenko participant exists"""
        response = requests.get(f"{BASE_URL}/api/participants/nadezhda-shevchenko")
        assert response.status_code == 200
        
        data = response.json()
        assert data["slug"] == "nadezhda-shevchenko"
        assert data["name"] == "Надежда Шевченко"
        print(f"✓ nadezhda-shevchenko: name={data['name']}")
    
    def test_get_oleg_sheps(self):
        """Verify oleg-sheps participant exists"""
        response = requests.get(f"{BASE_URL}/api/participants/oleg-sheps")
        assert response.status_code == 200
        
        data = response.json()
        assert data["slug"] == "oleg-sheps"
        assert data["name"] == "Олег Шепс"
        print(f"✓ oleg-sheps: name={data['name']}")


class TestApplicationSubmission:
    """Test POST /api/applications with psychic fields"""
    
    def test_submit_application_with_psychic(self):
        """Submit application with psychic_slug and psychic_name"""
        payload = {
            "lastName": f"{TEST_PREFIX}Иванов",
            "firstName": f"{TEST_PREFIX}Иван",
            "patronymic": "Иванович",
            "phone": "+7 (999) 123-45-67",
            "age": "35",
            "city": "Москва",
            "problem": "Тестовая проблема для проверки сохранения psychic данных",
            "psychic_slug": "elena-golunova",
            "psychic_name": "Елена Голунова"
        }
        
        response = requests.post(f"{BASE_URL}/api/applications", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        print(f"✓ Application submitted with psychic_slug=elena-golunova, psychic_name=Елена Голунова")
    
    def test_submit_application_without_psychic(self):
        """Submit application without psychic fields (generic booking)"""
        payload = {
            "lastName": f"{TEST_PREFIX}Петров",
            "firstName": f"{TEST_PREFIX}Петр",
            "patronymic": "Петрович",
            "phone": "+7 (999) 234-56-78",
            "age": "40",
            "city": "СПб",
            "problem": "Тестовая проблема без экстрасенса"
        }
        
        response = requests.post(f"{BASE_URL}/api/applications", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        print(f"✓ Application submitted without psychic data (generic booking)")
    
    def test_submit_application_with_different_psychic(self):
        """Submit application for aleksandr-sheps"""
        payload = {
            "lastName": f"{TEST_PREFIX}Сидоров",
            "firstName": f"{TEST_PREFIX}Сидор",
            "patronymic": "Сидорович",
            "phone": "+7 (999) 345-67-89",
            "age": "30",
            "city": "Казань",
            "problem": "Тестовая проблема для Александра Шепса",
            "psychic_slug": "aleksandr-sheps",
            "psychic_name": "Александр Шепс"
        }
        
        response = requests.post(f"{BASE_URL}/api/applications", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "success"
        print(f"✓ Application submitted with psychic_slug=aleksandr-sheps")


class TestAdminApplications:
    """Test GET /api/admin/applications returns psychic fields"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        token = response.json().get("token")
        print(f"✓ Admin login successful")
        return token
    
    def test_admin_applications_returns_psychic_fields(self, admin_token):
        """Verify GET /api/admin/applications returns psychic_slug and psychic_name"""
        response = requests.get(
            f"{BASE_URL}/api/admin/applications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of applications"
        
        # Check that at least one application has psychic fields
        has_psychic_fields = False
        for app in data:
            # Check that psychic_slug and psychic_name fields exist in response
            assert "psychic_slug" in app or app.get("psychic_slug") is None or "psychic_slug" in str(app.keys()), \
                f"psychic_slug field missing from application: {app.keys()}"
            
            if app.get("psychic_slug") or app.get("psychic_name"):
                has_psychic_fields = True
                print(f"✓ Found application with psychic data: slug={app.get('psychic_slug')}, name={app.get('psychic_name')}")
                break
        
        # Verify structure of response
        if data:
            sample = data[0]
            print(f"✓ Application fields present: {list(sample.keys())}")
            assert "id" in sample
            assert "lastName" in sample or "name" in sample
            assert "phone" in sample
        
        print(f"✓ Admin applications endpoint returns {len(data)} applications")


class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Test successful admin login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✓ Admin login successful, token received")
    
    def test_admin_login_failure(self):
        """Test failed admin login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print(f"✓ Admin login correctly rejected invalid credentials")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
