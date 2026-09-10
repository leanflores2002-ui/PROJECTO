from uuid import uuid4
from fastapi.testclient import TestClient
from fastapi import HTTPException
from backend.app import main, public_api


def test_order_never_uses_json_stock(monkeypatch):
    def unavailable():
        raise HTTPException(503, 'Database unavailable')
    monkeypatch.setattr(public_api, 'database_connection', unavailable)
    response = TestClient(main.app).post('/api/orders', json={
        'request_key': str(uuid4()), 'items': [{'productId': 'p1', 'color': 'Lila', 'size': 'M', 'qty': 1}]})
    assert response.status_code == 503


def test_order_rejects_negative_quantity():
    response = TestClient(main.app).post('/api/orders', json={
        'request_key': str(uuid4()), 'items': [{'productId': 'p1', 'color': 'Lila', 'size': 'M', 'qty': -1}]})
    assert response.status_code == 422
