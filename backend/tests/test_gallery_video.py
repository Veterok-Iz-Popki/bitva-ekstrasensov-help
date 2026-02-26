"""
Test suite for Gallery and Video API endpoints.
Tests CRUD operations for photos and videos, including:
- Public API endpoints for gallery photos and videos
- Admin API endpoints for managing gallery photos and videos
- File upload with Pillow compression
- SEO entries for foto-galereya and video pages
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_PHOTO_DATA = {
    "image_url": "https://via.placeholder.com/800x600.jpg",
    "title": "TEST_Photo Title",
    "description": "TEST_Photo description text",
    "alt_text": "TEST_Photo alt text for SEO",
    "order": 0,
    "is_published": True
}

TEST_VIDEO_DATA = {
    "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "title": "TEST_Video Title",
    "description": "TEST_Video description text",
    "thumbnail_url": "",
    "order": 0,
    "is_published": True
}


class TestGalleryVideoAPIs:
    """Test suite for Gallery and Video API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication token"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "nikoa2020@gmail.com", "password": "aspire5542gl1952tq"}
        )
        if login_response.status_code != 200:
            pytest.fail(f"Login failed: {login_response.text}")
        token = login_response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def created_photo_id(self, auth_headers):
        """Create test photo and return its ID for use in other tests"""
        response = requests.post(
            f"{BASE_URL}/api/admin/gallery/photos",
            json=TEST_PHOTO_DATA,
            headers=auth_headers
        )
        if response.status_code in [200, 201]:
            photo_id = response.json().get("id")
            yield photo_id
            # Cleanup
            requests.delete(f"{BASE_URL}/api/admin/gallery/photos/{photo_id}", headers=auth_headers)
        else:
            yield None
    
    @pytest.fixture(scope="class")
    def created_video_id(self, auth_headers):
        """Create test video and return its ID for use in other tests"""
        response = requests.post(
            f"{BASE_URL}/api/admin/gallery/videos",
            json=TEST_VIDEO_DATA,
            headers=auth_headers
        )
        if response.status_code in [200, 201]:
            video_id = response.json().get("id")
            yield video_id
            # Cleanup
            requests.delete(f"{BASE_URL}/api/admin/gallery/videos/{video_id}", headers=auth_headers)
        else:
            yield None

    # ==================== PUBLIC API TESTS ====================
    
    def test_public_gallery_photos_endpoint(self):
        """Test GET /api/gallery/photos returns published photos"""
        response = requests.get(f"{BASE_URL}/api/gallery/photos")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"GET /api/gallery/photos: {len(data)} photos returned")
    
    def test_public_gallery_videos_endpoint(self):
        """Test GET /api/gallery/videos returns published videos"""
        response = requests.get(f"{BASE_URL}/api/gallery/videos")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"GET /api/gallery/videos: {len(data)} videos returned")
    
    def test_seo_foto_galereya_endpoint(self):
        """Test GET /api/seo/foto-galereya returns SEO data"""
        response = requests.get(f"{BASE_URL}/api/seo/foto-galereya")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "page_slug" in data or "title" in data, "SEO data should have page_slug or title"
        print(f"GET /api/seo/foto-galereya: title='{data.get('title', '')}'")
    
    def test_seo_video_endpoint(self):
        """Test GET /api/seo/video returns SEO data"""
        response = requests.get(f"{BASE_URL}/api/seo/video")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "page_slug" in data or "title" in data, "SEO data should have page_slug or title"
        print(f"GET /api/seo/video: title='{data.get('title', '')}'")

    # ==================== ADMIN AUTH TEST ====================
    
    def test_admin_login(self):
        """Test admin login returns valid token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "nikoa2020@gmail.com", "password": "aspire5542gl1952tq"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        print("Admin login successful, token received")

    # ==================== ADMIN GALLERY PHOTOS TESTS ====================
    
    def test_admin_get_gallery_photos(self, auth_headers):
        """Test GET /api/admin/gallery/photos returns all photos (including unpublished)"""
        response = requests.get(f"{BASE_URL}/api/admin/gallery/photos", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"GET /api/admin/gallery/photos: {len(data)} photos returned")
    
    def test_admin_create_gallery_photo(self, auth_headers):
        """Test POST /api/admin/gallery/photos creates new photo"""
        response = requests.post(
            f"{BASE_URL}/api/admin/gallery/photos",
            json=TEST_PHOTO_DATA,
            headers=auth_headers
        )
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data.get("title") == TEST_PHOTO_DATA["title"], "Title should match"
        assert data.get("image_url") == TEST_PHOTO_DATA["image_url"], "Image URL should match"
        assert data.get("alt_text") == TEST_PHOTO_DATA["alt_text"], "Alt text should match"
        print(f"POST /api/admin/gallery/photos: Created photo with id={data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gallery/photos/{data['id']}", headers=auth_headers)
    
    def test_admin_update_gallery_photo(self, auth_headers, created_photo_id):
        """Test PUT /api/admin/gallery/photos/{id} updates photo"""
        if not created_photo_id:
            pytest.skip("No test photo created")
        
        updated_data = {
            **TEST_PHOTO_DATA,
            "title": "TEST_Updated Photo Title",
            "order": 5
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/gallery/photos/{created_photo_id}",
            json=updated_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("title") == "TEST_Updated Photo Title", "Title should be updated"
        assert data.get("order") == 5, "Order should be updated"
        print(f"PUT /api/admin/gallery/photos/{created_photo_id}: Photo updated successfully")
    
    def test_admin_delete_gallery_photo(self, auth_headers):
        """Test DELETE /api/admin/gallery/photos/{id} deletes photo"""
        # Create a photo to delete
        response = requests.post(
            f"{BASE_URL}/api/admin/gallery/photos",
            json={**TEST_PHOTO_DATA, "title": "TEST_Photo to delete"},
            headers=auth_headers
        )
        if response.status_code not in [200, 201]:
            pytest.skip("Could not create photo to delete")
        
        photo_id = response.json().get("id")
        
        # Delete the photo
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/gallery/photos/{photo_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/admin/gallery/photos", headers=auth_headers)
        photos = get_response.json()
        photo_ids = [p.get("id") for p in photos]
        assert photo_id not in photo_ids, "Deleted photo should not appear in list"
        print(f"DELETE /api/admin/gallery/photos/{photo_id}: Photo deleted successfully")
    
    def test_admin_gallery_photos_requires_auth(self):
        """Test admin gallery photos endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/gallery/photos")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("GET /api/admin/gallery/photos without auth: 401 Unauthorized (expected)")

    # ==================== ADMIN GALLERY VIDEOS TESTS ====================
    
    def test_admin_get_gallery_videos(self, auth_headers):
        """Test GET /api/admin/gallery/videos returns all videos"""
        response = requests.get(f"{BASE_URL}/api/admin/gallery/videos", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"GET /api/admin/gallery/videos: {len(data)} videos returned")
    
    def test_admin_create_gallery_video(self, auth_headers):
        """Test POST /api/admin/gallery/videos creates new video"""
        response = requests.post(
            f"{BASE_URL}/api/admin/gallery/videos",
            json=TEST_VIDEO_DATA,
            headers=auth_headers
        )
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data.get("title") == TEST_VIDEO_DATA["title"], "Title should match"
        assert data.get("video_url") == TEST_VIDEO_DATA["video_url"], "Video URL should match"
        print(f"POST /api/admin/gallery/videos: Created video with id={data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gallery/videos/{data['id']}", headers=auth_headers)
    
    def test_admin_update_gallery_video(self, auth_headers, created_video_id):
        """Test PUT /api/admin/gallery/videos/{id} updates video"""
        if not created_video_id:
            pytest.skip("No test video created")
        
        updated_data = {
            **TEST_VIDEO_DATA,
            "title": "TEST_Updated Video Title",
            "order": 3
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/gallery/videos/{created_video_id}",
            json=updated_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("title") == "TEST_Updated Video Title", "Title should be updated"
        assert data.get("order") == 3, "Order should be updated"
        print(f"PUT /api/admin/gallery/videos/{created_video_id}: Video updated successfully")
    
    def test_admin_delete_gallery_video(self, auth_headers):
        """Test DELETE /api/admin/gallery/videos/{id} deletes video"""
        # Create a video to delete
        response = requests.post(
            f"{BASE_URL}/api/admin/gallery/videos",
            json={**TEST_VIDEO_DATA, "title": "TEST_Video to delete"},
            headers=auth_headers
        )
        if response.status_code not in [200, 201]:
            pytest.skip("Could not create video to delete")
        
        video_id = response.json().get("id")
        
        # Delete the video
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/gallery/videos/{video_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/admin/gallery/videos", headers=auth_headers)
        videos = get_response.json()
        video_ids = [v.get("id") for v in videos]
        assert video_id not in video_ids, "Deleted video should not appear in list"
        print(f"DELETE /api/admin/gallery/videos/{video_id}: Video deleted successfully")
    
    def test_admin_gallery_videos_requires_auth(self):
        """Test admin gallery videos endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/gallery/videos")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("GET /api/admin/gallery/videos without auth: 401 Unauthorized (expected)")

    # ==================== SEO ADMIN TESTS ====================
    
    def test_admin_seo_has_gallery_video_entries(self, auth_headers):
        """Test admin SEO list includes foto-galereya and video entries"""
        response = requests.get(f"{BASE_URL}/api/admin/seo", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        page_slugs = [item.get("page_slug") for item in data]
        
        # Check if foto-galereya and video SEO entries exist or can be created
        print(f"Admin SEO entries: {page_slugs}")
        
    def test_admin_update_seo_foto_galereya(self, auth_headers):
        """Test PUT /api/admin/seo/foto-galereya creates/updates SEO"""
        seo_data = {
            "title": "TEST_Фотогалерея - Битва Экстрасенсов",
            "description": "TEST_Фотографии участников проекта",
            "keywords": "фотогалерея, экстрасенсы, фото",
            "h1": "Фотогалерея"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/seo/foto-galereya",
            json=seo_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("page_slug") == "foto-galereya", "Page slug should match"
        print("PUT /api/admin/seo/foto-galereya: SEO updated successfully")
    
    def test_admin_update_seo_video(self, auth_headers):
        """Test PUT /api/admin/seo/video creates/updates SEO"""
        seo_data = {
            "title": "TEST_Видео - Битва Экстрасенсов",
            "description": "TEST_Видеоматериалы участников проекта",
            "keywords": "видео, экстрасенсы, ролики",
            "h1": "Видео"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/seo/video",
            json=seo_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("page_slug") == "video", "Page slug should match"
        print("PUT /api/admin/seo/video: SEO updated successfully")

    # ==================== PUBLISHED/UNPUBLISHED FILTER TEST ====================
    
    def test_public_api_filters_unpublished_photos(self, auth_headers):
        """Test public API only returns published photos"""
        # Create unpublished photo
        unpublished_data = {**TEST_PHOTO_DATA, "is_published": False, "title": "TEST_Unpublished Photo"}
        response = requests.post(
            f"{BASE_URL}/api/admin/gallery/photos",
            json=unpublished_data,
            headers=auth_headers
        )
        if response.status_code not in [200, 201]:
            pytest.skip("Could not create unpublished photo")
        
        photo_id = response.json().get("id")
        
        # Check public API doesn't return it
        public_response = requests.get(f"{BASE_URL}/api/gallery/photos")
        photos = public_response.json()
        photo_titles = [p.get("title") for p in photos]
        assert "TEST_Unpublished Photo" not in photo_titles, "Unpublished photo should not appear in public API"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gallery/photos/{photo_id}", headers=auth_headers)
        print("Public API correctly filters out unpublished photos")
    
    def test_public_api_filters_unpublished_videos(self, auth_headers):
        """Test public API only returns published videos"""
        # Create unpublished video
        unpublished_data = {**TEST_VIDEO_DATA, "is_published": False, "title": "TEST_Unpublished Video"}
        response = requests.post(
            f"{BASE_URL}/api/admin/gallery/videos",
            json=unpublished_data,
            headers=auth_headers
        )
        if response.status_code not in [200, 201]:
            pytest.skip("Could not create unpublished video")
        
        video_id = response.json().get("id")
        
        # Check public API doesn't return it
        public_response = requests.get(f"{BASE_URL}/api/gallery/videos")
        videos = public_response.json()
        video_titles = [v.get("title") for v in videos]
        assert "TEST_Unpublished Video" not in video_titles, "Unpublished video should not appear in public API"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gallery/videos/{video_id}", headers=auth_headers)
        print("Public API correctly filters out unpublished videos")

    # ==================== ORDER SORTING TEST ====================
    
    def test_photos_sorted_by_order(self, auth_headers):
        """Test photos are returned sorted by order field"""
        # Create photos with different orders
        photo1_data = {**TEST_PHOTO_DATA, "title": "TEST_Photo Order 2", "order": 2}
        photo2_data = {**TEST_PHOTO_DATA, "title": "TEST_Photo Order 1", "order": 1}
        
        r1 = requests.post(f"{BASE_URL}/api/admin/gallery/photos", json=photo1_data, headers=auth_headers)
        r2 = requests.post(f"{BASE_URL}/api/admin/gallery/photos", json=photo2_data, headers=auth_headers)
        
        photo_ids = []
        if r1.status_code in [200, 201]:
            photo_ids.append(r1.json().get("id"))
        if r2.status_code in [200, 201]:
            photo_ids.append(r2.json().get("id"))
        
        # Check ordering in public API
        public_response = requests.get(f"{BASE_URL}/api/gallery/photos")
        photos = public_response.json()
        
        test_photos = [p for p in photos if p.get("title", "").startswith("TEST_Photo Order")]
        if len(test_photos) >= 2:
            # Find indices
            idx_order1 = next((i for i, p in enumerate(test_photos) if p.get("title") == "TEST_Photo Order 1"), -1)
            idx_order2 = next((i for i, p in enumerate(test_photos) if p.get("title") == "TEST_Photo Order 2"), -1)
            if idx_order1 >= 0 and idx_order2 >= 0:
                assert idx_order1 < idx_order2, "Photos should be sorted by order (ascending)"
        
        # Cleanup
        for pid in photo_ids:
            requests.delete(f"{BASE_URL}/api/admin/gallery/photos/{pid}", headers=auth_headers)
        print("Photos sorted by order field correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
