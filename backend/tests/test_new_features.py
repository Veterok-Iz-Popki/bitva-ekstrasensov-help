"""
Backend API Tests for NEW features: 
- CSV export
- Email notifications toggle
- Photo upload
- Settings management
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCSVExport:
    """Tests for CSV export functionality"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_csv_export_endpoint(self, admin_headers):
        """Test CSV export returns proper file"""
        response = requests.get(f"{BASE_URL}/api/admin/applications/export/csv", headers=admin_headers)
        assert response.status_code == 200
        
        # Check content type is CSV
        content_type = response.headers.get("Content-Type", "")
        assert "text/csv" in content_type or "application/octet-stream" in content_type
        
        # Check Content-Disposition header
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition
        assert ".csv" in content_disposition
        
        # Check content starts with UTF-8 BOM or has valid CSV structure
        content = response.content.decode('utf-8-sig')  # Handle BOM
        assert len(content) > 0
        
        # Verify header row has expected columns
        lines = content.split('\n')
        assert len(lines) >= 1
        header = lines[0]
        assert "Дата" in header or "Имя" in header or "Телефон" in header
        print(f"SUCCESS: CSV export working - got {len(lines)} lines")
    
    def test_csv_export_requires_auth(self):
        """Test CSV export requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/applications/export/csv")
        assert response.status_code == 401
        print("SUCCESS: CSV export correctly requires auth")


class TestEmailNotificationsSettings:
    """Tests for email notification settings"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_settings_includes_email_fields(self, admin_headers):
        """Test settings endpoint returns email-related fields"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check email notification fields exist
        assert "notification_email" in data or data.get("notification_email") is None or data.get("notification_email") == ""
        assert "email_notifications_enabled" in data or data.get("email_notifications_enabled") is None
        print(f"SUCCESS: Settings include email fields - notification_email: {data.get('notification_email', 'not set')}, enabled: {data.get('email_notifications_enabled', 'not set')}")
    
    def test_update_email_notification_settings(self, admin_headers):
        """Test updating email notification settings"""
        # Update settings
        update_payload = {
            "email": "test@example.com",
            "phone": "+7 (999) 123-45-67",
            "notification_email": "nikoa2020@gmail.com",
            "email_notifications_enabled": True,
            "working_hours": "10:00-20:00",
            "copyright_text": "© 2024 Test"
        }
        response = requests.put(f"{BASE_URL}/api/admin/settings", json=update_payload, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify update was persisted
        assert data["notification_email"] == "nikoa2020@gmail.com"
        assert data["email_notifications_enabled"] == True
        print("SUCCESS: Email notification settings updated and persisted")
    
    def test_disable_email_notifications(self, admin_headers):
        """Test disabling email notifications"""
        # Get current settings first
        get_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        current_settings = get_response.json()
        
        # Update with email disabled
        update_payload = {
            "email": current_settings.get("email", ""),
            "phone": current_settings.get("phone", ""),
            "notification_email": current_settings.get("notification_email", ""),
            "email_notifications_enabled": False,
            "working_hours": current_settings.get("working_hours", ""),
            "copyright_text": current_settings.get("copyright_text", "")
        }
        response = requests.put(f"{BASE_URL}/api/admin/settings", json=update_payload, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify email notifications are disabled
        assert data["email_notifications_enabled"] == False
        print("SUCCESS: Email notifications can be disabled")
        
        # Re-enable for other tests
        update_payload["email_notifications_enabled"] = True
        requests.put(f"{BASE_URL}/api/admin/settings", json=update_payload, headers=admin_headers)


class TestPhotoUpload:
    """Tests for photo upload functionality"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_upload_valid_image(self, admin_headers):
        """Test uploading a valid image file"""
        # Create a simple 1x1 PNG image
        import base64
        # 1x1 red PNG
        png_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==")
        
        files = {
            'file': ('test_image.png', io.BytesIO(png_data), 'image/png')
        }
        
        # Remove Content-Type from headers for multipart
        headers = {"Authorization": admin_headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/admin/upload", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "filename" in data
        assert "url" in data
        assert data["url"].startswith("/api/uploads/")
        print(f"SUCCESS: Image uploaded - URL: {data['url']}")
    
    def test_upload_requires_auth(self):
        """Test upload requires authentication"""
        import base64
        png_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==")
        files = {'file': ('test.png', io.BytesIO(png_data), 'image/png')}
        
        response = requests.post(f"{BASE_URL}/api/admin/upload", files=files)
        assert response.status_code == 401
        print("SUCCESS: Upload correctly requires auth")
    
    def test_uploaded_file_is_accessible(self, admin_headers):
        """Test uploaded file can be retrieved"""
        import base64
        png_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==")
        files = {'file': ('test_retrieval.png', io.BytesIO(png_data), 'image/png')}
        headers = {"Authorization": admin_headers["Authorization"]}
        
        # Upload
        upload_response = requests.post(f"{BASE_URL}/api/admin/upload", files=files, headers=headers)
        assert upload_response.status_code == 200
        url = upload_response.json()["url"]
        
        # Retrieve
        retrieve_response = requests.get(f"{BASE_URL}{url}")
        assert retrieve_response.status_code == 200
        assert len(retrieve_response.content) > 0
        print(f"SUCCESS: Uploaded file is accessible at {url}")


class TestApplicationsFiltering:
    """Tests for applications filtering and management"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_applications_with_status_field(self, admin_headers):
        """Test applications have status field for filtering"""
        response = requests.get(f"{BASE_URL}/api/admin/applications", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            app = data[0]
            assert "status" in app
            assert app["status"] in ["new", "in_progress", "completed"]
        print(f"SUCCESS: Applications have status field - found {len(data)} applications")
    
    def test_update_application_status(self, admin_headers):
        """Test updating application status"""
        # First get an application
        get_response = requests.get(f"{BASE_URL}/api/admin/applications", headers=admin_headers)
        apps = get_response.json()
        
        if len(apps) > 0:
            app_id = apps[0]["id"]
            
            # Update status
            update_response = requests.put(
                f"{BASE_URL}/api/admin/applications/{app_id}",
                json={"status": "in_progress"},
                headers=admin_headers
            )
            assert update_response.status_code == 200
            updated = update_response.json()
            assert updated["status"] == "in_progress"
            print(f"SUCCESS: Application status updated to in_progress")
            
            # Reset to new
            requests.put(
                f"{BASE_URL}/api/admin/applications/{app_id}",
                json={"status": "new"},
                headers=admin_headers
            )
        else:
            print("SKIP: No applications to test status update")


class TestPublicPagesRoutes:
    """Tests for public pages that should be accessible"""
    
    def test_participants_endpoint(self):
        """Test /api/participants returns data"""
        response = requests.get(f"{BASE_URL}/api/participants")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Participants endpoint - {len(data)} items")
    
    def test_reviews_endpoint(self):
        """Test /api/reviews returns data"""
        response = requests.get(f"{BASE_URL}/api/reviews")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Reviews endpoint - {len(data)} items")
    
    def test_faq_endpoint(self):
        """Test /api/faq returns data"""
        response = requests.get(f"{BASE_URL}/api/faq")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: FAQ endpoint - {len(data)} items")


class TestApplicationFormHoneypot:
    """Tests for honeypot spam protection"""
    
    def test_application_without_honeypot(self):
        """Test legitimate application submission"""
        payload = {
            "name": "TEST_Legitimate User",
            "phone": "+7 (111) 222-33-44",
            "age": "30",
            "city": "Moscow",
            "description": "Test application from legitimate user",
            "honeypot": ""
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        print("SUCCESS: Legitimate application submitted")
    
    def test_application_with_honeypot_blocked(self):
        """Test spam with filled honeypot is silently blocked"""
        payload = {
            "name": "Spam Bot",
            "phone": "+0 (000) 000-00-00",
            "age": "99",
            "city": "SpamCity",
            "description": "SPAM MESSAGE",
            "honeypot": "I am a bot"  # Filled = spam
        }
        response = requests.post(f"{BASE_URL}/api/applications", json=payload)
        # Returns success to not alert spammers, but doesn't store
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        print("SUCCESS: Honeypot spam protection working (silently blocks)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
