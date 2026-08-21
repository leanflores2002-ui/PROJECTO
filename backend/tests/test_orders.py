import json
import pytest
from fastapi.testclient import TestClient

from backend.app import main


@pytest.fixture(autouse=True)
def avoid_writing_inventory_file(monkeypatch):
    monkeypatch.setattr(main, "persist_variants", lambda: None)


def setup_state():
    # Productos de prueba
    main._products_cache = [
        {"id": "p1", "name": "Producto 1"},
    ]
    main._products_mtime = main.DATA_FILE.stat().st_mtime
    main._products_json_cache = json.dumps(main._products_cache, ensure_ascii=False)
    # Variantes de prueba
    main._variants = {
        ("p1", "lila", "m"): {
            "id": "v1",
            "product_id": "p1",
            "color": "Lila",
            "size": "M",
            "stock": 2,
        }
    }


def test_order_ok():
    setup_state()
    client = TestClient(main.app)
    resp = client.post(
        "/api/orders",
        json={"items": [{"productId": "p1", "color": "Lila", "size": "M", "qty": 1}]},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["updatedVariants"][0]["stock"] == 1


def test_order_insufficient_stock():
    setup_state()
    client = TestClient(main.app)
    resp = client.post(
        "/api/orders",
        json={"items": [{"productId": "p1", "color": "Lila", "size": "M", "qty": 5}]},
    )
    assert resp.status_code == 400
    assert "Stock insuficiente" in resp.json()["detail"]
