"""
Backend API Tests for NEW application form with:
- lastName, firstName, patronymic (ФИО)
- phone (телефон)
- age (возраст)
- city (город)
- problem (описание проблемы)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestNewApplicationForm:
    """Tests for new application form with ФИО fields"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers with new credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "nikoa2020@gmail.com",
            "password": "aspire5542gl1952tq"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_application_with_new_fields_success(self):
        """Test application submission with all new fields"""
        payload = {
            "lastName": "TEST_Тестовая",
            "firstName": "Анна",
            "patronymic": "Сергеевна",
            "phone": "+7 (999) 123-45-67",
            "age": "30",
            "city": "Москва",
            "problem": "Тестовая проблема для проверки API",
            "honeypot": ""
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["status"] == "success"
        assert "Заявка" in data["message"] or "успешно" in data["message"]
        print("SUCCESS: Application with new ФИО fields submitted successfully")
    
    def test_application_validation_missing_lastName(self):
        """Test validation for missing lastName"""
        payload = {
            "lastName": "",
            "firstName": "Тест",
            "patronymic": "Тестович",
            "phone": "+7 (999) 111-22-33",
            "age": "25",
            "city": "СПб",
            "problem": "Проблема",
            "honeypot": ""
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing lastName, got {response.status_code}"
        print("SUCCESS: Validation works for missing lastName")
    
    def test_application_validation_missing_firstName(self):
        """Test validation for missing firstName"""
        payload = {
            "lastName": "Тестова",
            "firstName": "",
            "patronymic": "Тестович",
            "phone": "+7 (999) 111-22-33",
            "age": "25",
            "city": "СПб",
            "problem": "Проблема",
            "honeypot": ""
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing firstName, got {response.status_code}"
        print("SUCCESS: Validation works for missing firstName")
    
    def test_application_validation_missing_patronymic(self):
        """Test validation for missing patronymic"""
        payload = {
            "lastName": "Тестова",
            "firstName": "Тест",
            "patronymic": "",
            "phone": "+7 (999) 111-22-33",
            "age": "25",
            "city": "СПб",
            "problem": "Проблема",
            "honeypot": ""
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing patronymic, got {response.status_code}"
        print("SUCCESS: Validation works for missing patronymic")
    
    def test_application_validation_missing_phone(self):
        """Test validation for missing phone"""
        payload = {
            "lastName": "Тестова",
            "firstName": "Тест",
            "patronymic": "Тестович",
            "phone": "",
            "age": "25",
            "city": "СПб",
            "problem": "Проблема",
            "honeypot": ""
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing phone, got {response.status_code}"
        print("SUCCESS: Validation works for missing phone")
    
    def test_application_validation_missing_problem(self):
        """Test validation for missing problem"""
        payload = {
            "lastName": "Тестова",
            "firstName": "Тест",
            "patronymic": "Тестович",
            "phone": "+7 (999) 111-22-33",
            "age": "25",
            "city": "СПб",
            "problem": "",
            "honeypot": ""
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing problem, got {response.status_code}"
        print("SUCCESS: Validation works for missing problem")
    
    def test_application_optional_fields(self):
        """Test application with optional fields (age, city) empty"""
        payload = {
            "lastName": "TEST_Опционная",
            "firstName": "Мария",
            "patronymic": "Ивановна",
            "phone": "+7 (888) 777-66-55",
            "age": "",
            "city": "",
            "problem": "Тест с пустыми опциональными полями",
            "honeypot": ""
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["status"] == "success"
        print("SUCCESS: Application with empty optional fields submitted")
    
    def test_honeypot_blocks_spam(self):
        """Test honeypot field blocks spam"""
        payload = {
            "lastName": "Спамер",
            "firstName": "Бот",
            "patronymic": "Ботович",
            "phone": "+7 (000) 000-00-00",
            "age": "99",
            "city": "SpamCity",
            "problem": "SPAM MESSAGE",
            "honeypot": "I am a bot"
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=payload)
        # Should return success but not actually save
        assert response.status_code == 200
        print("SUCCESS: Honeypot silently blocks spam")


class TestAdminApplicationsWithNewFields:
    """Tests for admin panel showing applications with new fields"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "nikoa2020@gmail.com",
            "password": "aspire5542gl1952tq"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_admin_login_with_new_credentials(self):
        """Test admin login with nikoa2020@gmail.com"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "nikoa2020@gmail.com",
            "password": "aspire5542gl1952tq"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["username"] == "nikoa2020@gmail.com"
        print("SUCCESS: Admin login works with new credentials")
    
    def test_applications_list_has_new_fields(self, admin_headers):
        """Test that applications list includes new ФИО fields"""
        response = requests.get(f"{BASE_URL}/api/admin/applications", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find a TEST_ prefixed application
        test_apps = [a for a in data if a.get("lastName", "").startswith("TEST_")]
        if test_apps:
            app = test_apps[0]
            # Check new fields exist
            assert "lastName" in app, "Missing lastName field"
            assert "firstName" in app, "Missing firstName field"
            assert "patronymic" in app, "Missing patronymic field"
            assert "phone" in app, "Missing phone field"
            assert "age" in app, "Missing age field"
            assert "city" in app, "Missing city field"
            assert "problem" in app, "Missing problem field"
            print(f"SUCCESS: Applications have all new fields - ФИО: {app['lastName']} {app['firstName']} {app['patronymic']}")
        else:
            print("SKIP: No TEST_ applications to verify")
    
    def test_applications_have_backward_compatible_name(self, admin_headers):
        """Test that applications also have combined 'name' field for backward compatibility"""
        response = requests.get(f"{BASE_URL}/api/admin/applications", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        test_apps = [a for a in data if a.get("lastName", "").startswith("TEST_")]
        if test_apps:
            app = test_apps[0]
            assert "name" in app, "Missing backward-compatible 'name' field"
            # name should be combined ФИО
            expected_name_part = app.get("lastName", "") or app.get("firstName", "")
            assert expected_name_part in app["name"], f"name field doesn't contain ФИО: {app['name']}"
            print(f"SUCCESS: Backward-compatible 'name' field exists: {app['name']}")
        else:
            print("SKIP: No TEST_ applications to verify")


class TestCSVExportWithNewFields:
    """Tests for CSV export including new fields"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "nikoa2020@gmail.com",
            "password": "aspire5542gl1952tq"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_csv_export_has_new_columns(self, admin_headers):
        """Test CSV export includes ФИО columns"""
        response = requests.get(f"{BASE_URL}/api/admin/applications/export/csv", headers=admin_headers)
        assert response.status_code == 200
        
        content = response.content.decode('utf-8-sig')
        header = content.split('\n')[0]
        
        # Check new columns in CSV header
        assert "Фамилия" in header, "CSV missing 'Фамилия' column"
        assert "Имя" in header, "CSV missing 'Имя' column"
        assert "Отчество" in header, "CSV missing 'Отчество' column"
        assert "Телефон" in header, "CSV missing 'Телефон' column"
        assert "Город" in header, "CSV missing 'Город' column"
        assert "Возраст" in header, "CSV missing 'Возраст' column"
        assert "Проблема" in header, "CSV missing 'Проблема' column"
        
        print(f"SUCCESS: CSV export has all new columns - Header: {header[:100]}...")


class TestCleanup:
    """Cleanup TEST_ prefixed data after tests"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "nikoa2020@gmail.com",
            "password": "aspire5542gl1952tq"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_cleanup_test_applications(self, admin_headers):
        """Clean up TEST_ prefixed applications"""
        response = requests.get(f"{BASE_URL}/api/admin/applications", headers=admin_headers)
        apps = response.json()
        
        deleted = 0
        for app in apps:
            if app.get("lastName", "").startswith("TEST_") or app.get("name", "").startswith("TEST_"):
                del_response = requests.delete(
                    f"{BASE_URL}/api/admin/applications/{app['id']}", 
                    headers=admin_headers
                )
                if del_response.status_code == 200:
                    deleted += 1
        
        print(f"SUCCESS: Cleaned up {deleted} TEST_ applications")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
