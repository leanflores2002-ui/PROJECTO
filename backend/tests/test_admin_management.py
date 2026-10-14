from uuid import uuid4
from fastapi.testclient import TestClient
from backend.app import main, admin_management
from backend.app.security import AdminPrincipal, require_admin
import pytest


@pytest.fixture
def admin_client(monkeypatch):
    monkeypatch.delenv('GA4_PROPERTY_ID', raising=False)
    principal = AdminPrincipal(uuid4(), 'owner@example.test', 'superadmin', 'Propietario')
    main.app.dependency_overrides[require_admin] = lambda: principal
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


def test_private_endpoints_require_login():
    client = TestClient(main.app)
    for path in ['/api/admin/notifications', '/api/admin/analytics', '/api/admin/products']:
        assert client.get(path).status_code == 401


def test_unconfigured_analytics_never_fabricates_metrics(admin_client):
    data = admin_client.get('/api/admin/analytics').json()
    assert data['configured'] is False
    assert data['summary'] is None and data['daily'] == []


def test_period_validation(admin_client):
    assert admin_client.get('/api/admin/analytics?start=2026-10-14&end=2026-10-01').status_code == 422
    assert admin_client.get('/api/admin/analytics?start=2020-01-01&end=2026-10-01').status_code == 422


def test_report_mapping_uses_unique_period_total(admin_client, monkeypatch):
    monkeypatch.setenv('GA4_PROPERTY_ID', '123456')
    def reports(prop, requests):
        assert prop == '123456'
        assert requests[2]['metrics'][0]['name'] == 'itemsViewed'
        assert requests[3]['dimensionFilter']['filter']['stringFilter']['value'] == 'whatsapp_order_click'
        return [
            {'rows':[{'dimensionValues':[{'value':'20261001'}], 'metricValues':[{'value':'5'},{'value':'8'},{'value':'12'}]}]},
            {'rows':[{'metricValues':[{'value':'7'},{'value':'16'},{'value':'24'}]}]},
            {'rows':[{'dimensionValues':[{'value':'calza'},{'value':'Calza'}], 'metricValues':[{'value':'11'},{'value':'3'}]}]},
            {'rows':[{'metricValues':[{'value':'2'}]}]}
        ]
    monkeypatch.setattr(admin_management,'google_reports',reports)
    result=admin_client.get('/api/admin/analytics?start=2026-10-01&end=2026-10-02')
    assert result.status_code == 200
    assert result.json()['summary']['totalUsers'] == 7
    assert result.json()['products'][0]['itemsAddedToCart'] == 3
    assert result.json()['whatsappClicks'] == 2


def test_editor_cannot_invite_or_promote_users(admin_client):
    main.app.dependency_overrides[require_admin] = lambda: AdminPrincipal(uuid4(),None,'operator','Editor')
    assert admin_client.post('/api/admin/users/invite',json={'email':'admin@example.test','display_name':'Admin','role':'admin'}).status_code==403
    main.app.dependency_overrides[require_admin] = lambda: AdminPrincipal(uuid4(),None,'superadmin','Propietario')
    assert admin_client.post('/api/admin/users/invite',json={'email':'admin@example.test','display_name':'Admin','role':'superadmin'}).status_code==422


def test_viewer_cannot_write_images(admin_client):
    main.app.dependency_overrides[require_admin] = lambda: AdminPrincipal(uuid4(),None,'viewer','Lector')
    assert admin_client.post(f'/api/public/admin/product-images/{uuid4()}/primary').status_code==403
