"""
Test suite for 4 new Service Pages feature:
- /finansovaya-magiya (Финансовая магия)
- /lyubovnaya-magiya (Любовная магия)  
- /magiya-zhizni (Магия жизни)
- /magicheskaya-zashchita (Магическая защита)

Service pages use 'service-' prefix in DB (e.g., service-finansovaya-magiya)
but URL is /finansovaya-magiya. ServicePage.js prepends 'service-' when making API calls.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://spiritual-guide-60.preview.emergentagent.com').rstrip('/')

# 4 Service page slugs
SERVICE_SLUGS = [
    'service-finansovaya-magiya',
    'service-lyubovnaya-magiya',
    'service-magiya-zhizni',
    'service-magicheskaya-zashchita',
]

SERVICE_TITLES = {
    'service-finansovaya-magiya': 'Финансовая магия',
    'service-lyubovnaya-magiya': 'Любовная магия',
    'service-magiya-zhizni': 'Магия жизни',
    'service-magicheskaya-zashchita': 'Магическая защита',
}

# Required blocks for service pages
REQUIRED_BLOCKS = ['title', 'description', 'directions', 'situations', 'how_it_works', 'results', 'cta_title', 'cta_text', 'cta_button']


class TestServicePagesAPI:
    """Tests for GET /api/pages/service-{slug} endpoints"""

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_get_service_page_returns_200(self, slug):
        """Each service page API returns 200 status"""
        response = requests.get(f"{BASE_URL}/api/pages/{slug}")
        assert response.status_code == 200, f"Expected 200 for {slug}, got {response.status_code}"

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_service_page_has_blocks(self, slug):
        """Each service page has a 'blocks' object"""
        response = requests.get(f"{BASE_URL}/api/pages/{slug}")
        assert response.status_code == 200
        data = response.json()
        assert 'blocks' in data, f"Missing 'blocks' in {slug}"
        assert isinstance(data['blocks'], dict), f"'blocks' should be a dict in {slug}"
        assert len(data['blocks']) > 0, f"'blocks' is empty for {slug}"

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_service_page_has_correct_title(self, slug):
        """Each service page has the correct H1 title"""
        response = requests.get(f"{BASE_URL}/api/pages/{slug}")
        data = response.json()
        blocks = data.get('blocks', {})
        expected_title = SERVICE_TITLES[slug]
        assert blocks.get('title') == expected_title, f"Expected title '{expected_title}', got '{blocks.get('title')}'"

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_service_page_has_required_blocks(self, slug):
        """Each service page has all required content blocks"""
        response = requests.get(f"{BASE_URL}/api/pages/{slug}")
        data = response.json()
        blocks = data.get('blocks', {})
        
        for block_key in REQUIRED_BLOCKS:
            assert block_key in blocks, f"Missing required block '{block_key}' in {slug}"
            assert blocks[block_key] is not None, f"Block '{block_key}' is None in {slug}"
            assert len(str(blocks[block_key])) > 0, f"Block '{block_key}' is empty in {slug}"

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_service_page_description_has_content(self, slug):
        """Each service page has a meaningful description"""
        response = requests.get(f"{BASE_URL}/api/pages/{slug}")
        data = response.json()
        blocks = data.get('blocks', {})
        description = blocks.get('description', '')
        
        assert len(description) >= 100, f"Description too short in {slug}: {len(description)} chars"
        assert '\n' in description, f"Description should have multiple paragraphs in {slug}"

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_service_page_directions_are_multiline(self, slug):
        """Directions block contains multiple items (newline-separated)"""
        response = requests.get(f"{BASE_URL}/api/pages/{slug}")
        data = response.json()
        blocks = data.get('blocks', {})
        directions = blocks.get('directions', '')
        
        items = [line for line in directions.split('\n') if line.strip()]
        assert len(items) >= 3, f"Expected at least 3 direction items in {slug}, got {len(items)}"

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_service_page_situations_are_multiline(self, slug):
        """Situations block contains multiple items"""
        response = requests.get(f"{BASE_URL}/api/pages/{slug}")
        data = response.json()
        blocks = data.get('blocks', {})
        situations = blocks.get('situations', '')
        
        items = [line for line in situations.split('\n') if line.strip()]
        assert len(items) >= 3, f"Expected at least 3 situation items in {slug}, got {len(items)}"

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_service_page_how_it_works_steps(self, slug):
        """How it works block contains multiple steps"""
        response = requests.get(f"{BASE_URL}/api/pages/{slug}")
        data = response.json()
        blocks = data.get('blocks', {})
        how_it_works = blocks.get('how_it_works', '')
        
        steps = [line for line in how_it_works.split('\n') if line.strip()]
        assert len(steps) >= 4, f"Expected at least 4 steps in {slug}, got {len(steps)}"

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_service_page_results_are_multiline(self, slug):
        """Results block contains multiple items"""
        response = requests.get(f"{BASE_URL}/api/pages/{slug}")
        data = response.json()
        blocks = data.get('blocks', {})
        results = blocks.get('results', '')
        
        items = [line for line in results.split('\n') if line.strip()]
        assert len(items) >= 3, f"Expected at least 3 result items in {slug}, got {len(items)}"

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_service_page_cta_fields(self, slug):
        """CTA fields are properly populated"""
        response = requests.get(f"{BASE_URL}/api/pages/{slug}")
        data = response.json()
        blocks = data.get('blocks', {})
        
        assert len(blocks.get('cta_title', '')) >= 5, f"CTA title too short in {slug}"
        assert len(blocks.get('cta_text', '')) >= 20, f"CTA text too short in {slug}"
        assert len(blocks.get('cta_button', '')) >= 5, f"CTA button text too short in {slug}"


class TestServicePagesSEO:
    """Tests for GET /api/seo/service-{slug} endpoints"""

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_get_seo_returns_200(self, slug):
        """SEO endpoint returns 200 for each service page"""
        response = requests.get(f"{BASE_URL}/api/seo/{slug}")
        assert response.status_code == 200, f"Expected 200 for SEO {slug}, got {response.status_code}"

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_seo_has_title(self, slug):
        """SEO entry has a title"""
        response = requests.get(f"{BASE_URL}/api/seo/{slug}")
        data = response.json()
        assert 'title' in data, f"Missing 'title' in SEO for {slug}"
        assert len(data['title']) >= 20, f"SEO title too short for {slug}"

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_seo_has_description(self, slug):
        """SEO entry has a description of appropriate length"""
        response = requests.get(f"{BASE_URL}/api/seo/{slug}")
        data = response.json()
        assert 'description' in data, f"Missing 'description' in SEO for {slug}"
        desc_len = len(data['description'])
        assert 50 <= desc_len <= 350, f"SEO description length {desc_len} not optimal (50-350) for {slug}"

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_seo_has_keywords(self, slug):
        """SEO entry has keywords"""
        response = requests.get(f"{BASE_URL}/api/seo/{slug}")
        data = response.json()
        assert 'keywords' in data, f"Missing 'keywords' in SEO for {slug}"
        assert len(data['keywords']) >= 10, f"SEO keywords too short for {slug}"

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_seo_has_h1(self, slug):
        """SEO entry has H1 field matching page title"""
        response = requests.get(f"{BASE_URL}/api/seo/{slug}")
        data = response.json()
        expected_title = SERVICE_TITLES[slug]
        assert data.get('h1') == expected_title, f"SEO H1 mismatch for {slug}: expected '{expected_title}', got '{data.get('h1')}'"

    @pytest.mark.parametrize("slug", SERVICE_SLUGS)
    def test_seo_has_og_fields(self, slug):
        """SEO entry has OG title and description"""
        response = requests.get(f"{BASE_URL}/api/seo/{slug}")
        data = response.json()
        assert len(data.get('og_title', '')) >= 10, f"OG title too short for {slug}"
        assert len(data.get('og_description', '')) >= 20, f"OG description too short for {slug}"


class TestServicePagesAdmin:
    """Tests for admin endpoints (PUT /api/admin/pages and /api/admin/seo)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "nikoa2020@gmail.com",
            "password": "aspire5542gl1952tq"
        })
        assert login_response.status_code == 200, "Admin login failed"
        return login_response.json().get('token')

    def test_admin_login_works(self):
        """Admin login returns token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "nikoa2020@gmail.com",
            "password": "aspire5542gl1952tq"
        })
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data
        assert len(data['token']) > 20

    def test_admin_update_page_requires_auth(self):
        """PUT /api/admin/pages/{slug} requires authentication"""
        response = requests.put(f"{BASE_URL}/api/admin/pages/service-finansovaya-magiya", json={
            "blocks": {"title": "Test"}
        })
        assert response.status_code == 401, "Expected 401 without auth token"

    def test_admin_update_seo_requires_auth(self):
        """PUT /api/admin/seo/{slug} requires authentication"""
        response = requests.put(f"{BASE_URL}/api/admin/seo/service-finansovaya-magiya", json={
            "title": "Test"
        })
        assert response.status_code == 401, "Expected 401 without auth token"

    def test_admin_can_update_service_page(self, auth_token):
        """Admin can update service page content"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get original content
        original = requests.get(f"{BASE_URL}/api/pages/service-finansovaya-magiya").json()
        original_blocks = original.get('blocks', {})
        
        # Update with slightly modified content
        test_cta_title = "TEST_Хотите улучшить финансы?"
        updated_blocks = {**original_blocks, "cta_title": test_cta_title}
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/pages/service-finansovaya-magiya",
            headers=headers,
            json={"blocks": updated_blocks}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update persisted
        verify_response = requests.get(f"{BASE_URL}/api/pages/service-finansovaya-magiya")
        verified = verify_response.json()
        assert verified['blocks'].get('cta_title') == test_cta_title, "Update did not persist"
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/pages/service-finansovaya-magiya",
            headers=headers,
            json={"blocks": original_blocks}
        )

    def test_admin_can_update_service_seo(self, auth_token):
        """Admin can update service page SEO settings"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get original SEO
        original = requests.get(f"{BASE_URL}/api/seo/service-lyubovnaya-magiya").json()
        
        # Update with test value
        test_title = "TEST_Любовная магия — возврат любимого"
        update_response = requests.put(
            f"{BASE_URL}/api/admin/seo/service-lyubovnaya-magiya",
            headers=headers,
            json={
                "title": test_title,
                "description": original.get('description', ''),
                "keywords": original.get('keywords', ''),
                "h1": original.get('h1', ''),
                "og_title": original.get('og_title', ''),
                "og_description": original.get('og_description', '')
            }
        )
        assert update_response.status_code == 200, f"SEO update failed: {update_response.text}"
        
        # Verify update persisted
        verify_response = requests.get(f"{BASE_URL}/api/seo/service-lyubovnaya-magiya")
        verified = verify_response.json()
        assert verified.get('title') == test_title, "SEO update did not persist"
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/seo/service-lyubovnaya-magiya",
            headers=headers,
            json=original
        )


class TestTopicPagesRegression:
    """Regression tests: Verify previously created 6 topic pages still work"""
    
    TOPIC_SLUGS = [
        'topic-porcha',
        'topic-proklyatie',
        'topic-sglaz',
        'topic-venets-bezbrachiya',
        'topic-privorot',
        'topic-zaklyatie',
    ]
    
    @pytest.mark.parametrize("slug", TOPIC_SLUGS)
    def test_topic_page_still_works(self, slug):
        """Topic page API still returns data"""
        response = requests.get(f"{BASE_URL}/api/pages/{slug}")
        assert response.status_code == 200, f"Topic page {slug} failed"
        data = response.json()
        assert 'blocks' in data
        assert data['blocks'].get('title'), f"Topic page {slug} missing title"

    @pytest.mark.parametrize("slug", TOPIC_SLUGS)
    def test_topic_seo_still_works(self, slug):
        """Topic page SEO still returns data"""
        response = requests.get(f"{BASE_URL}/api/seo/{slug}")
        assert response.status_code == 200, f"Topic SEO {slug} failed"
        data = response.json()
        assert data.get('title'), f"Topic SEO {slug} missing title"


class TestUniqueContent:
    """Verify all service pages have unique content"""
    
    def test_all_service_pages_have_unique_descriptions(self):
        """Each service page has unique description content"""
        descriptions = []
        for slug in SERVICE_SLUGS:
            response = requests.get(f"{BASE_URL}/api/pages/{slug}")
            data = response.json()
            desc = data.get('blocks', {}).get('description', '')
            descriptions.append(desc)
        
        # Check all descriptions are unique
        assert len(set(descriptions)) == len(descriptions), "Service pages have duplicate descriptions"

    def test_all_service_pages_have_unique_seo_titles(self):
        """Each service page has unique SEO title"""
        titles = []
        for slug in SERVICE_SLUGS:
            response = requests.get(f"{BASE_URL}/api/seo/{slug}")
            data = response.json()
            titles.append(data.get('title', ''))
        
        assert len(set(titles)) == len(titles), "Service pages have duplicate SEO titles"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
