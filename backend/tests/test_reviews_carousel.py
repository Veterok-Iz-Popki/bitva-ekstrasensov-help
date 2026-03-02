"""
Test suite for Reviews Carousel Feature
- GET /api/reviews endpoint with participant_name enrichment
- Navigation menu 'Отзывы' link functionality
- /otzyvy route removed (should 404)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestReviewsAPI:
    """Tests for /api/reviews endpoint"""

    def test_reviews_endpoint_returns_200(self):
        """GET /api/reviews should return 200"""
        response = requests.get(f"{BASE_URL}/api/reviews?limit=30")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/reviews returns 200")

    def test_reviews_returns_list(self):
        """GET /api/reviews should return a list"""
        response = requests.get(f"{BASE_URL}/api/reviews?limit=30")
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ GET /api/reviews returns list with {len(data)} reviews")

    def test_reviews_have_required_fields(self):
        """Each review should have required fields"""
        response = requests.get(f"{BASE_URL}/api/reviews?limit=30")
        data = response.json()
        if len(data) == 0:
            pytest.skip("No reviews in database")
        
        review = data[0]
        required_fields = ['id', 'author_name', 'text', 'rating', 'is_published']
        for field in required_fields:
            assert field in review, f"Missing field: {field}"
        print(f"✓ Reviews have required fields: {required_fields}")

    def test_reviews_have_participant_name_enrichment(self):
        """Reviews with participant_slug should have participant_name enriched"""
        response = requests.get(f"{BASE_URL}/api/reviews?limit=30")
        data = response.json()
        if len(data) == 0:
            pytest.skip("No reviews in database")
        
        # Find a review with participant_slug
        reviews_with_slug = [r for r in data if r.get('participant_slug')]
        if len(reviews_with_slug) == 0:
            pytest.skip("No reviews with participant_slug found")
        
        review = reviews_with_slug[0]
        assert 'participant_name' in review, "Missing participant_name enrichment"
        assert review['participant_name'], "participant_name should not be empty when participant_slug exists"
        print(f"✓ Reviews have participant_name enrichment: '{review['participant_name']}' for slug '{review['participant_slug']}'")

    def test_reviews_limit_parameter(self):
        """GET /api/reviews?limit=5 should respect limit"""
        response = requests.get(f"{BASE_URL}/api/reviews?limit=5")
        data = response.json()
        assert len(data) <= 5, f"Expected max 5 reviews, got {len(data)}"
        print(f"✓ Reviews limit parameter works (requested 5, got {len(data)})")

    def test_reviews_only_published(self):
        """All returned reviews should have is_published=True"""
        response = requests.get(f"{BASE_URL}/api/reviews?limit=30")
        data = response.json()
        if len(data) == 0:
            pytest.skip("No reviews in database")
        
        for review in data:
            assert review.get('is_published') == True, f"Found unpublished review: {review.get('id')}"
        print(f"✓ All {len(data)} reviews have is_published=True")

    def test_reviews_have_rating_1_to_5(self):
        """All reviews should have rating between 1 and 5"""
        response = requests.get(f"{BASE_URL}/api/reviews?limit=30")
        data = response.json()
        if len(data) == 0:
            pytest.skip("No reviews in database")
        
        for review in data:
            rating = review.get('rating', 0)
            assert 1 <= rating <= 5, f"Invalid rating {rating} for review {review.get('id')}"
        print(f"✓ All reviews have valid ratings (1-5)")


class TestOtzyvyRouteRemoved:
    """Tests to verify /otzyvy route is removed"""

    def test_otzyvy_api_route_404(self):
        """GET /api/otzyvy should return 404"""
        response = requests.get(f"{BASE_URL}/api/otzyvy")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ /api/otzyvy returns 404 (route removed)")


class TestParticipantReviewsEndpoint:
    """Tests for /api/participants/{slug}/reviews endpoint"""

    def test_participant_reviews_endpoint(self):
        """GET /api/participants/{slug}/reviews should work"""
        # First get a participant slug
        participants_response = requests.get(f"{BASE_URL}/api/participants")
        participants = participants_response.json()
        if len(participants) == 0:
            pytest.skip("No participants in database")
        
        slug = participants[0].get('slug')
        response = requests.get(f"{BASE_URL}/api/participants/{slug}/reviews")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ GET /api/participants/{slug}/reviews returns 200")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
