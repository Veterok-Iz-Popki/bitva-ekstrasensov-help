"""
Test suite for participant reviews feature
- Tests GET /api/participants/{slug}/reviews endpoint
- Tests POST/PUT/DELETE admin reviews with participant_slug
- Tests review linking and unlinking to participants
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# All 8 participants with their slugs
PARTICIPANTS = [
    "marina-svetlova",
    "aleksandr-volkov", 
    "elena-tarasova",
    "dmitriy-karpov",
    "natalya-orlova",
    "igor-petrov",
    "vera-kuznetsova",
    "sergey-morozov"
]


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/admin/login", json={
        "username": "nikoa2020@gmail.com",
        "password": "aspire5542gl1952tq"
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestParticipantReviewsPublicAPI:
    """Tests for public participant reviews endpoint"""
    
    @pytest.mark.parametrize("slug", PARTICIPANTS)
    def test_get_participant_reviews_returns_12(self, api_client, slug):
        """Each participant should have exactly 12 reviews"""
        response = api_client.get(f"{BASE_URL}/api/participants/{slug}/reviews")
        assert response.status_code == 200
        
        reviews = response.json()
        assert isinstance(reviews, list)
        assert len(reviews) == 12, f"Expected 12 reviews for {slug}, got {len(reviews)}"
    
    def test_reviews_have_required_fields(self, api_client):
        """Each review should have author_name, author_city, text, rating, participant_slug"""
        response = api_client.get(f"{BASE_URL}/api/participants/marina-svetlova/reviews")
        assert response.status_code == 200
        
        reviews = response.json()
        for review in reviews:
            assert "author_name" in review, "Review missing author_name"
            assert "author_city" in review, "Review missing author_city"
            assert "text" in review, "Review missing text"
            assert "rating" in review, "Review missing rating"
            assert "participant_slug" in review, "Review missing participant_slug"
            assert review["participant_slug"] == "marina-svetlova"
    
    def test_reviews_have_valid_ratings(self, api_client):
        """All ratings should be between 1 and 5"""
        for slug in PARTICIPANTS[:3]:  # Test first 3 participants
            response = api_client.get(f"{BASE_URL}/api/participants/{slug}/reviews")
            reviews = response.json()
            
            for review in reviews:
                assert 1 <= review["rating"] <= 5, f"Invalid rating {review['rating']} for {slug}"
    
    def test_nonexistent_participant_returns_empty_list(self, api_client):
        """Reviews endpoint for non-existent participant should return empty list"""
        response = api_client.get(f"{BASE_URL}/api/participants/nonexistent-person/reviews")
        assert response.status_code == 200
        assert response.json() == []
    
    def test_reviews_only_published(self, api_client):
        """Public endpoint should only return published reviews"""
        response = api_client.get(f"{BASE_URL}/api/participants/marina-svetlova/reviews")
        reviews = response.json()
        
        for review in reviews:
            assert review.get("is_published", True), "Found unpublished review in public API"


class TestAdminReviewsAPI:
    """Tests for admin reviews CRUD with participant_slug"""
    
    def test_admin_reviews_list_includes_participant_slug(self, authenticated_client):
        """Admin reviews list should include participant_slug field"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/reviews")
        assert response.status_code == 200
        
        reviews = response.json()
        assert len(reviews) >= 96, f"Expected at least 96 reviews, got {len(reviews)}"
        
        # Check that reviews have participant_slug
        reviews_with_slug = [r for r in reviews if r.get("participant_slug")]
        assert len(reviews_with_slug) >= 96, "Most reviews should have participant_slug"
    
    def test_create_review_with_participant_slug(self, authenticated_client):
        """Creating review with participant_slug should link it to participant"""
        # Create review linked to elena-tarasova
        create_data = {
            "author_name": "TEST_CreateSlug",
            "author_city": "Test City",
            "text": "Test review text",
            "rating": 5,
            "is_published": True,
            "participant_slug": "elena-tarasova"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/admin/reviews", json=create_data)
        assert response.status_code == 200
        
        created = response.json()
        assert created["participant_slug"] == "elena-tarasova"
        assert created["author_name"] == "TEST_CreateSlug"
        
        review_id = created["id"]
        
        # Verify in participant reviews
        pub_response = authenticated_client.get(f"{BASE_URL}/api/participants/elena-tarasova/reviews")
        pub_reviews = pub_response.json()
        test_review = [r for r in pub_reviews if r["author_name"] == "TEST_CreateSlug"]
        assert len(test_review) == 1, "Created review not found in participant reviews"
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/admin/reviews/{review_id}")
    
    def test_update_review_participant_slug(self, authenticated_client):
        """Updating participant_slug should move review to different participant"""
        # Create review
        create_data = {
            "author_name": "TEST_UpdateSlug",
            "author_city": "Test City",
            "text": "Test review for update",
            "rating": 4,
            "is_published": True,
            "participant_slug": "dmitriy-karpov"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/admin/reviews", json=create_data)
        review_id = response.json()["id"]
        
        # Update to different participant
        update_data = {
            "author_name": "TEST_UpdateSlug",
            "author_city": "Test City Updated",
            "text": "Test review updated",
            "rating": 5,
            "is_published": True,
            "participant_slug": "natalya-orlova"
        }
        
        update_response = authenticated_client.put(f"{BASE_URL}/api/admin/reviews/{review_id}", json=update_data)
        assert update_response.status_code == 200
        assert update_response.json()["participant_slug"] == "natalya-orlova"
        
        # Verify moved to new participant
        orlova_reviews = authenticated_client.get(f"{BASE_URL}/api/participants/natalya-orlova/reviews").json()
        found = [r for r in orlova_reviews if r["author_name"] == "TEST_UpdateSlug"]
        assert len(found) == 1, "Review not found in new participant"
        
        # Verify removed from old participant
        karpov_reviews = authenticated_client.get(f"{BASE_URL}/api/participants/dmitriy-karpov/reviews").json()
        not_found = [r for r in karpov_reviews if r["author_name"] == "TEST_UpdateSlug"]
        assert len(not_found) == 0, "Review still in old participant"
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/admin/reviews/{review_id}")
    
    def test_create_review_without_participant_slug(self, authenticated_client):
        """Creating review without participant_slug should work (general review)"""
        create_data = {
            "author_name": "TEST_NoSlug",
            "author_city": "General City",
            "text": "General review without participant link",
            "rating": 5,
            "is_published": True,
            "participant_slug": ""
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/admin/reviews", json=create_data)
        assert response.status_code == 200
        
        created = response.json()
        assert created["participant_slug"] == ""
        
        review_id = created["id"]
        
        # Should not appear in any participant reviews
        for slug in PARTICIPANTS[:2]:
            reviews = authenticated_client.get(f"{BASE_URL}/api/participants/{slug}/reviews").json()
            found = [r for r in reviews if r["author_name"] == "TEST_NoSlug"]
            assert len(found) == 0, f"Review without slug found in {slug}"
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/admin/reviews/{review_id}")
    
    def test_admin_can_filter_reviews_by_participant(self, authenticated_client):
        """Admin should be able to filter reviews by participant_slug"""
        # Get all reviews
        response = authenticated_client.get(f"{BASE_URL}/api/admin/reviews")
        all_reviews = response.json()
        
        # Filter on client side (simulating frontend filtering)
        marina_reviews = [r for r in all_reviews if r.get("participant_slug") == "marina-svetlova"]
        assert len(marina_reviews) == 12, f"Expected 12 reviews for marina-svetlova, got {len(marina_reviews)}"
        
        no_slug_reviews = [r for r in all_reviews if not r.get("participant_slug")]
        # Expect 0 or minimal reviews without participant_slug
        assert len(no_slug_reviews) < 10, f"Too many reviews without participant_slug: {len(no_slug_reviews)}"


class TestAdminParticipantsAPI:
    """Tests for admin participants API to verify filter dropdown data"""
    
    def test_admin_participants_list_for_filter(self, authenticated_client):
        """Admin should get all participants for filter dropdown"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/participants")
        assert response.status_code == 200
        
        participants = response.json()
        assert len(participants) == 8, f"Expected 8 participants, got {len(participants)}"
        
        slugs = [p["slug"] for p in participants]
        for expected_slug in PARTICIPANTS:
            assert expected_slug in slugs, f"Missing participant {expected_slug}"


class TestReviewDataIntegrity:
    """Tests for review data integrity and content"""
    
    def test_review_texts_are_meaningful(self, api_client):
        """Review texts should be substantial, not placeholder"""
        response = api_client.get(f"{BASE_URL}/api/participants/marina-svetlova/reviews")
        reviews = response.json()
        
        for review in reviews:
            assert len(review["text"]) > 50, f"Review text too short: {review['text'][:30]}..."
            assert len(review["author_name"]) > 3, f"Author name too short: {review['author_name']}"
    
    def test_review_cities_are_populated(self, api_client):
        """Reviews should have city information"""
        response = api_client.get(f"{BASE_URL}/api/participants/aleksandr-volkov/reviews")
        reviews = response.json()
        
        cities_populated = [r for r in reviews if r.get("author_city")]
        assert len(cities_populated) >= 10, "Most reviews should have city info"
    
    def test_different_participants_have_different_reviews(self, api_client):
        """Each participant should have unique reviews (no duplicates across participants)"""
        marina_reviews = api_client.get(f"{BASE_URL}/api/participants/marina-svetlova/reviews").json()
        aleksandr_reviews = api_client.get(f"{BASE_URL}/api/participants/aleksandr-volkov/reviews").json()
        
        marina_authors = set(r["author_name"] for r in marina_reviews)
        aleksandr_authors = set(r["author_name"] for r in aleksandr_reviews)
        
        # Authors should be different between participants
        overlap = marina_authors.intersection(aleksandr_authors)
        assert len(overlap) == 0, f"Found duplicate authors across participants: {overlap}"


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_reviews(self, authenticated_client):
        """Remove any remaining test reviews"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/reviews")
        reviews = response.json()
        
        test_reviews = [r for r in reviews if r["author_name"].startswith("TEST_")]
        for review in test_reviews:
            authenticated_client.delete(f"{BASE_URL}/api/admin/reviews/{review['id']}")
        
        # Verify cleanup
        response2 = authenticated_client.get(f"{BASE_URL}/api/admin/reviews")
        remaining_test = [r for r in response2.json() if r["author_name"].startswith("TEST_")]
        assert len(remaining_test) == 0, f"Test reviews not cleaned up: {len(remaining_test)}"
