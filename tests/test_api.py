from fastapi.testclient import TestClient

from api.main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get('/health')
    assert response.status_code == 200
    payload = response.json()
    assert payload['status'] == 'ok'


def test_analytics_endpoint():
    response = client.get('/analytics')
    assert response.status_code == 200
    payload = response.json()
    assert 'total_queries' in payload
    assert 'cache_hit_rate' in payload


def test_documents_endpoint():
    response = client.get('/documents')
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
