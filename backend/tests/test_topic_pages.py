"""
Tests for Topic Pages feature - 6 navigational pages with SEO
Topics: Порча, Проклятие, Сглаз, Венец безбрачия, Приворот, Заклятие
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Topic page slugs (DB uses 'topic-' prefix, URLs are short)
TOPIC_SLUGS = ['porcha', 'proklyatie', 'sglaz', 'venets-bezbrachiya', 'privorot', 'zaklyatie']
TOPIC_NAMES = {
    'porcha': 'Порча',
    'proklyatie': 'Проклятие',
    'sglaz': 'Сглаз',
    'venets-bezbrachiya': 'Венец безбрачия',
    'privorot': 'Приворот',
    'zaklyatie': 'Заклятие',
}


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    """Get authentication token for admin endpoints"""
    response = api_client.post(f"{BASE_URL}/api/admin/login", json={
        "username": "nikoa2020@gmail.com",
        "password": "aspire5542gl1952tq"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping admin tests")


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header for admin endpoints"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestTopicPagesPublicAPI:
    """Test public API endpoints for topic pages"""
    
    @pytest.mark.parametrize("slug", TOPIC_SLUGS)
    def test_get_topic_page_content(self, api_client, slug):
        """Test GET /api/pages/topic-{slug} returns correct data"""
        response = api_client.get(f"{BASE_URL}/api/pages/topic-{slug}")
        assert response.status_code == 200, f"Failed to get page for {slug}"
        
        data = response.json()
        assert "page_slug" in data, "Response should have page_slug"
        assert data["page_slug"] == f"topic-{slug}", f"page_slug should be topic-{slug}"
        
        # Verify blocks exist with required content
        blocks = data.get("blocks", {})
        assert "title" in blocks, f"Page {slug} should have title block"
        assert blocks["title"] == TOPIC_NAMES[slug], f"Title should be {TOPIC_NAMES[slug]}"
        assert "description" in blocks, f"Page {slug} should have description"
        assert "symptoms" in blocks, f"Page {slug} should have symptoms"
        assert "when_to_contact" in blocks, f"Page {slug} should have when_to_contact"
        assert "consultation_process" in blocks, f"Page {slug} should have consultation_process"
        assert "cta_button" in blocks, f"Page {slug} should have cta_button"
    
    @pytest.mark.parametrize("slug", TOPIC_SLUGS)
    def test_get_topic_page_seo(self, api_client, slug):
        """Test GET /api/seo/topic-{slug} returns SEO data"""
        response = api_client.get(f"{BASE_URL}/api/seo/topic-{slug}")
        assert response.status_code == 200, f"Failed to get SEO for {slug}"
        
        data = response.json()
        assert "page_slug" in data, "Response should have page_slug"
        assert data["page_slug"] == f"topic-{slug}", f"SEO page_slug should be topic-{slug}"
        
        # Verify SEO fields
        assert "title" in data, "SEO should have title"
        assert len(data["title"]) > 0, "SEO title should not be empty"
        assert "description" in data, "SEO should have description"
        assert len(data["description"]) > 0, "SEO description should not be empty"
        assert "keywords" in data, "SEO should have keywords"
        assert len(data["keywords"]) > 0, "SEO keywords should not be empty"
    
    def test_all_topics_have_unique_content(self, api_client):
        """Verify all topic pages have unique content (not duplicates)"""
        descriptions = set()
        for slug in TOPIC_SLUGS:
            response = api_client.get(f"{BASE_URL}/api/pages/topic-{slug}")
            assert response.status_code == 200
            data = response.json()
            description = data.get("blocks", {}).get("description", "")
            assert description not in descriptions, f"Duplicate description found for {slug}"
            descriptions.add(description)
    
    def test_topic_page_blocks_structure(self, api_client):
        """Test that topic page blocks have proper structure for porcha (representative test)"""
        response = api_client.get(f"{BASE_URL}/api/pages/topic-porcha")
        assert response.status_code == 200
        
        data = response.json()
        blocks = data.get("blocks", {})
        
        # Title section
        assert blocks.get("title") == "Порча"
        
        # Description should have multiple paragraphs
        description = blocks.get("description", "")
        assert len(description) > 100, "Description should be substantial"
        
        # Symptoms should be newline-separated
        symptoms = blocks.get("symptoms", "")
        symptom_list = symptoms.split('\n')
        assert len(symptom_list) >= 5, "Should have multiple symptoms"
        
        # When to contact should be newline-separated
        when_to_contact = blocks.get("when_to_contact", "")
        when_list = when_to_contact.split('\n')
        assert len(when_list) >= 3, "Should have multiple when_to_contact items"
        
        # Consultation process should be newline-separated steps
        process = blocks.get("consultation_process", "")
        process_list = process.split('\n')
        assert len(process_list) >= 4, "Should have multiple consultation steps"
        
        # CTA fields
        assert "cta_title" in blocks
        assert "cta_text" in blocks
        assert "cta_button" in blocks


class TestTopicPagesAdminAPI:
    """Test admin API endpoints for editing topic pages"""
    
    def test_admin_login(self, api_client):
        """Test admin login works"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "username": "nikoa2020@gmail.com",
            "password": "aspire5542gl1952tq"
        })
        assert response.status_code == 200, "Admin login should succeed"
        data = response.json()
        assert "token" in data, "Login should return token"
        assert len(data["token"]) > 0, "Token should not be empty"
    
    def test_admin_update_topic_page_requires_auth(self, api_client):
        """Test PUT /api/admin/pages/topic-porcha requires authentication"""
        response = api_client.put(f"{BASE_URL}/api/admin/pages/topic-porcha", json={
            "blocks": {"title": "Test"}
        })
        assert response.status_code == 401, "Should require authentication"
    
    def test_admin_update_seo_requires_auth(self, api_client):
        """Test PUT /api/admin/seo/topic-porcha requires authentication"""
        response = api_client.put(f"{BASE_URL}/api/admin/seo/topic-porcha", json={
            "title": "Test"
        })
        assert response.status_code == 401, "Should require authentication"
    
    def test_admin_can_update_topic_page(self, authenticated_client):
        """Test admin can update topic page content"""
        # First get original data
        original = authenticated_client.get(f"{BASE_URL}/api/pages/topic-porcha").json()
        original_blocks = original.get("blocks", {})
        
        # Update with test data
        test_title = "TEST_Порча_Updated"
        update_response = authenticated_client.put(f"{BASE_URL}/api/admin/pages/topic-porcha", json={
            "blocks": {**original_blocks, "title": test_title}
        })
        assert update_response.status_code == 200, "Update should succeed"
        
        # Verify GET returns updated data
        get_response = authenticated_client.get(f"{BASE_URL}/api/pages/topic-porcha")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["blocks"]["title"] == test_title, "Title should be updated"
        
        # Restore original title
        restore_response = authenticated_client.put(f"{BASE_URL}/api/admin/pages/topic-porcha", json={
            "blocks": original_blocks
        })
        assert restore_response.status_code == 200, "Restore should succeed"
    
    def test_admin_can_update_topic_seo(self, authenticated_client):
        """Test admin can update topic page SEO settings"""
        # First get original data
        original = authenticated_client.get(f"{BASE_URL}/api/seo/topic-porcha").json()
        
        # Update with test data
        test_title = "TEST_SEO_Порча"
        update_response = authenticated_client.put(f"{BASE_URL}/api/admin/seo/topic-porcha", json={
            "title": test_title,
            "description": original.get("description", ""),
            "keywords": original.get("keywords", ""),
            "h1": original.get("h1", ""),
            "og_title": original.get("og_title", ""),
            "og_description": original.get("og_description", ""),
        })
        assert update_response.status_code == 200, "SEO update should succeed"
        
        # Verify GET returns updated data
        get_response = authenticated_client.get(f"{BASE_URL}/api/seo/topic-porcha")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["title"] == test_title, "SEO title should be updated"
        
        # Restore original
        restore_response = authenticated_client.put(f"{BASE_URL}/api/admin/seo/topic-porcha", json={
            "title": original.get("title", ""),
            "description": original.get("description", ""),
            "keywords": original.get("keywords", ""),
            "h1": original.get("h1", ""),
            "og_title": original.get("og_title", ""),
            "og_description": original.get("og_description", ""),
        })
        assert restore_response.status_code == 200, "SEO restore should succeed"


class TestTopicPagesSEOContent:
    """Test SEO content quality for topic pages"""
    
    @pytest.mark.parametrize("slug", TOPIC_SLUGS)
    def test_seo_title_contains_keywords(self, api_client, slug):
        """SEO title should contain relevant keywords"""
        response = api_client.get(f"{BASE_URL}/api/seo/topic-{slug}")
        assert response.status_code == 200
        
        data = response.json()
        title = data.get("title", "").lower()
        # Title should mention экстрасенс or диагностика or снятие
        assert any(kw in title for kw in ["экстрасенс", "диагностика", "снятие", "помощь"]), \
            f"SEO title for {slug} should contain relevant keywords"
    
    @pytest.mark.parametrize("slug", TOPIC_SLUGS)
    def test_seo_description_length(self, api_client, slug):
        """SEO description should be appropriate length (50-300 chars)"""
        response = api_client.get(f"{BASE_URL}/api/seo/topic-{slug}")
        assert response.status_code == 200
        
        data = response.json()
        description = data.get("description", "")
        assert 50 <= len(description) <= 350, \
            f"SEO description for {slug} should be 50-350 chars, got {len(description)}"
    
    @pytest.mark.parametrize("slug", TOPIC_SLUGS)  
    def test_seo_keywords_not_empty(self, api_client, slug):
        """SEO keywords should not be empty"""
        response = api_client.get(f"{BASE_URL}/api/seo/topic-{slug}")
        assert response.status_code == 200
        
        data = response.json()
        keywords = data.get("keywords", "")
        assert len(keywords) >= 10, f"Keywords for {slug} should be substantial"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
