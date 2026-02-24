import requests
import sys
import json
from datetime import datetime

class EkstrasensovAPITester:
    def __init__(self, base_url="https://ekstrasensov-sajt.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.participant_id = None
        self.review_id = None
        self.faq_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_public_apis(self):
        """Test all public API endpoints"""
        print("\n=== TESTING PUBLIC APIs ===")
        
        # Root endpoint
        self.run_test("Root API", "GET", "/", 200)
        
        # Page endpoints
        self.run_test("Get Home Page", "GET", "/pages/home", 200)
        self.run_test("Get Participants Page", "GET", "/pages/participants", 200)
        
        # Content endpoints
        success, participants = self.run_test("Get Participants", "GET", "/participants", 200)
        if success and participants:
            print(f"   Found {len(participants)} participants")
        
        success, reviews = self.run_test("Get Reviews", "GET", "/reviews", 200)
        if success and reviews:
            print(f"   Found {len(reviews)} reviews")
            
        success, faq = self.run_test("Get FAQ", "GET", "/faq", 200)
        if success and faq:
            print(f"   Found {len(faq)} FAQ items")
        
        # SEO endpoints
        self.run_test("Get Home SEO", "GET", "/seo/home", 200)
        self.run_test("Get Participants SEO", "GET", "/seo/participants", 200)
        
        # Settings
        self.run_test("Get Settings", "GET", "/settings", 200)
        
        # Test specific participant by slug
        if participants:
            first_participant = participants[0]
            slug = first_participant.get('slug')
            if slug:
                self.run_test(f"Get Participant {slug}", "GET", f"/participants/{slug}", 200)

    def test_form_submissions(self):
        """Test form submission endpoints"""
        print("\n=== TESTING FORM SUBMISSIONS ===")
        
        # Test application form
        app_data = {
            "name": "Тест Пользователь",
            "phone": "+7 (999) 123-45-67",
            "messenger": "telegram",
            "description": "Тестовая заявка",
            "honeypot": ""
        }
        self.run_test("Submit Application", "POST", "/applications", 200, app_data)
        
        # Test honeypot protection
        honeypot_data = {
            "name": "Bot User",
            "phone": "+7 (999) 999-99-99", 
            "messenger": "telegram",
            "description": "Bot submission",
            "honeypot": "bot_filled_this"
        }
        self.run_test("Test Honeypot Protection", "POST", "/applications", 200, honeypot_data)
        
        # Test contact form
        contact_data = {
            "name": "Тест Контакт",
            "email": "test@example.com",
            "message": "Тестовое сообщение",
            "honeypot": ""
        }
        self.run_test("Submit Contact Form", "POST", "/contact", 200, contact_data)

    def test_admin_login(self):
        """Test admin authentication"""
        print("\n=== TESTING ADMIN AUTH ===")
        
        # Test login
        login_data = {"username": "admin", "password": "admin123"}
        success, response = self.run_test("Admin Login", "POST", "/admin/login", 200, login_data)
        
        if success and 'token' in response:
            self.token = response['token']
            print(f"   ✅ Token received: {self.token[:20]}...")
            
            # Test protected endpoint
            self.run_test("Admin Profile", "GET", "/admin/me", 200)
            return True
        else:
            print("   ❌ Failed to get admin token")
            return False

    def test_admin_applications(self):
        """Test admin application management"""
        print("\n=== TESTING ADMIN APPLICATIONS ===")
        
        if not self.token:
            print("❌ No admin token - skipping admin tests")
            return
            
        # Get applications
        success, apps = self.run_test("Get Applications", "GET", "/admin/applications", 200)
        if success and apps:
            print(f"   Found {len(apps)} applications")
            
            # Update first application if exists
            if apps:
                app_id = apps[0].get('id')
                if app_id:
                    update_data = {"status": "processed", "notes": "Test note"}
                    self.run_test("Update Application", "PUT", f"/admin/applications/{app_id}", 200, update_data)

    def test_admin_participants(self):
        """Test admin participant CRUD"""
        print("\n=== TESTING ADMIN PARTICIPANTS ===")
        
        if not self.token:
            print("❌ No admin token - skipping admin tests")
            return
            
        # Get participants
        success, participants = self.run_test("Get All Participants", "GET", "/admin/participants", 200)
        if success:
            print(f"   Found {len(participants or [])} participants")
        
        # Create participant
        create_data = {
            "slug": "test-participant",
            "name": "Тест Участник", 
            "title": "Экстрасенс-тестировщик",
            "description": "Тестовое описание",
            "full_description": "Полное тестовое описание",
            "photo_url": "https://images.unsplash.com/photo-1494790108755-2616b332c8c2?w=400",
            "specializations": ["Тестирование", "QA"],
            "is_active": True,
            "order": 999
        }
        success, participant = self.run_test("Create Participant", "POST", "/admin/participants", 200, create_data)
        if success and participant:
            self.participant_id = participant.get('id')
            print(f"   ✅ Created participant ID: {self.participant_id}")
            
            # Update participant
            update_data = {**create_data, "title": "Обновленный Экстрасенс"}
            self.run_test("Update Participant", "PUT", f"/admin/participants/{self.participant_id}", 200, update_data)

    def test_admin_reviews(self):
        """Test admin review CRUD"""
        print("\n=== TESTING ADMIN REVIEWS ===")
        
        if not self.token:
            print("❌ No admin token - skipping admin tests")
            return
            
        # Get reviews
        success, reviews = self.run_test("Get All Reviews", "GET", "/admin/reviews", 200)
        if success:
            print(f"   Found {len(reviews or [])} reviews")
            
        # Create review
        create_data = {
            "author_name": "Тест Клиент",
            "author_city": "Москва",
            "text": "Отличная работа! Все предсказания сбылись.",
            "rating": 5,
            "is_published": True
        }
        success, review = self.run_test("Create Review", "POST", "/admin/reviews", 200, create_data)
        if success and review:
            self.review_id = review.get('id')
            print(f"   ✅ Created review ID: {self.review_id}")

    def test_admin_faq(self):
        """Test admin FAQ CRUD"""
        print("\n=== TESTING ADMIN FAQ ===")
        
        if not self.token:
            print("❌ No admin token - skipping admin tests")
            return
            
        # Get FAQ
        success, faq = self.run_test("Get All FAQ", "GET", "/admin/faq", 200)
        if success:
            print(f"   Found {len(faq or [])} FAQ items")
            
        # Create FAQ
        create_data = {
            "question": "Тестовый вопрос?",
            "answer": "Тестовый ответ на важный вопрос.",
            "order": 999,
            "is_active": True
        }
        success, faq_item = self.run_test("Create FAQ", "POST", "/admin/faq", 200, create_data)
        if success and faq_item:
            self.faq_id = faq_item.get('id')
            print(f"   ✅ Created FAQ ID: {self.faq_id}")

    def test_admin_seo_and_pages(self):
        """Test admin SEO and page management"""
        print("\n=== TESTING ADMIN SEO & PAGES ===")
        
        if not self.token:
            print("❌ No admin token - skipping admin tests")
            return
            
        # Get SEO settings
        self.run_test("Get All SEO", "GET", "/admin/seo", 200)
        
        # Update SEO
        seo_data = {
            "title": "Битва экстрасенсов — Тест",
            "description": "Тестовое описание для SEO",
            "keywords": "тест, экстрасенсы, битва",
            "h1": "Тестовый H1",
            "og_title": "Тест OG заголовок",
            "og_description": "Тест OG описание"
        }
        self.run_test("Update Home SEO", "PUT", "/admin/seo/home", 200, seo_data)
        
        # Get pages
        self.run_test("Get All Pages", "GET", "/admin/pages", 200)
        
        # Update page content
        page_data = {
            "blocks": {
                "hero_subtitle": "Тестовый подзаголовок",
                "about_title": "О нас - Тест",
                "about_text": "Тестовый текст о проекте"
            }
        }
        self.run_test("Update Home Page", "PUT", "/admin/pages/home", 200, page_data)

    def test_admin_settings_and_stats(self):
        """Test admin settings and dashboard stats"""
        print("\n=== TESTING ADMIN SETTINGS & STATS ===")
        
        if not self.token:
            print("❌ No admin token - skipping admin tests")
            return
            
        # Get stats
        success, stats = self.run_test("Get Dashboard Stats", "GET", "/admin/stats", 200)
        if success and stats:
            print(f"   Stats: {json.dumps(stats, ensure_ascii=False)}")
            
        # Get settings
        self.run_test("Get Site Settings", "GET", "/admin/settings", 200)
        
        # Update settings
        settings_data = {
            "email": "test@example.com",
            "phone": "+7 (495) 123-45-67",
            "address": "Тестовый адрес",
            "notification_email": "notifications@test.com",
            "working_hours": "Пн-Пт: 9:00-18:00",
            "copyright_text": "© 2024 Тест"
        }
        self.run_test("Update Site Settings", "PUT", "/admin/settings", 200, settings_data)
        
        # Get contacts
        self.run_test("Get Contact Messages", "GET", "/admin/contacts", 200)

    def cleanup_test_data(self):
        """Clean up test data created during testing"""
        print("\n=== CLEANING UP TEST DATA ===")
        
        if not self.token:
            return
            
        # Delete test participant
        if self.participant_id:
            self.run_test("Delete Test Participant", "DELETE", f"/admin/participants/{self.participant_id}", 200)
            
        # Delete test review  
        if self.review_id:
            self.run_test("Delete Test Review", "DELETE", f"/admin/reviews/{self.review_id}", 200)
            
        # Delete test FAQ
        if self.faq_id:
            self.run_test("Delete Test FAQ", "DELETE", f"/admin/faq/{self.faq_id}", 200)

    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting API tests for: {self.base_url}")
        print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        try:
            # Test public APIs first
            self.test_public_apis()
            self.test_form_submissions()
            
            # Test admin functionality
            if self.test_admin_login():
                self.test_admin_applications()
                self.test_admin_participants() 
                self.test_admin_reviews()
                self.test_admin_faq()
                self.test_admin_seo_and_pages()
                self.test_admin_settings_and_stats()
                self.cleanup_test_data()
            else:
                print("\n❌ Admin login failed - skipping admin tests")
                
        except Exception as e:
            print(f"\n💥 Test suite failed with error: {str(e)}")
            
        # Print results
        print(f"\n📊 FINAL RESULTS")
        print(f"Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = EkstrasensovAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())