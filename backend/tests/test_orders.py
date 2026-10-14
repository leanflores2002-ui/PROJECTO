import json
from concurrent.futures import ThreadPoolExecutor
import pytest
from fastapi.testclient import TestClient

from backend.app import main


@pytest.fixture(autouse=True)
def isolated_inventory(tmp_path, monkeypatch):
    products = tmp_path / "products.json"
    products.write_text(json.dumps([{"id": "p1", "name": "Producto 1"}]), encoding="utf-8")
    variants = tmp_path / "variants.json"
    variants.write_text(json.dumps([{"id": "v1", "product_id": "p1", "color": "Lila", "size": "M", "stock": 2}]), encoding="utf-8")
    monkeypatch.setattr(main, "DATA_FILE", products)
    monkeypatch.setattr(main, "VARIANTS_FILE", variants)
    monkeypatch.setattr(main, "_products_cache", None)
    monkeypatch.setattr(main, "_products_mtime", None)
    monkeypatch.setattr(main, "_products_json_cache", None)
    monkeypatch.setattr(main, "_variants", {})


def test_order_ok():
    client = TestClient(main.app)
    resp = client.post(
        "/api/orders",
        json={"items": [{"productId": "p1", "color": "Lila", "size": "M", "qty": 1}]},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["updatedVariants"][0]["stock"] == 1


def test_order_insufficient_stock():
    client = TestClient(main.app)
    resp = client.post(
        "/api/orders",
        json={"items": [{"productId": "p1", "color": "Lila", "size": "M", "qty": 5}]},
    )
    assert resp.status_code == 400
    assert "Stock insuficiente" in resp.json()["detail"]


def item(qty=1, **changes):
    return {"productId": "p1", "color": "Lila", "size": "M", "qty": qty, **changes}


def stock():
    return json.loads(main.VARIANTS_FILE.read_text(encoding="utf-8"))[0]["stock"]


@pytest.mark.parametrize("qty", [None, 0, -1, 1.5, "1", "invalid", True, [], {}])
def test_invalid_quantity_is_controlled(qty):
    response = TestClient(main.app).post("/api/orders", json={"items": [item(qty)]})
    assert response.status_code == 400
    assert "entero positivo" in response.json()["detail"]
    assert stock() == 2


def test_duplicate_lines_are_aggregated():
    response = TestClient(main.app).post("/api/orders", json={"items": [item(), item(color="lila", size="m")]})
    assert response.status_code == 200
    assert response.json()["items"] == [{"productId": "p1", "color": "Lila", "size": "M", "qty": 2}]
    assert len(response.json()["updatedVariants"]) == 1
    assert stock() == 0


def test_duplicate_lines_cannot_exceed_stock():
    response = TestClient(main.app).post("/api/orders", json={"items": [item(2), item()]})
    assert response.status_code == 400
    assert "Stock insuficiente" in response.json()["detail"]
    assert stock() == 2
    assert main.get_variant("p1", "Lila", "M")["stock"] == 2


@pytest.mark.parametrize("invalid", [item(productId="missing"), item(size="invalid"), item(0), "invalid"])
def test_invalid_order_does_not_partially_reserve(invalid):
    response = TestClient(main.app).post("/api/orders", json={"items": [item(), invalid]})
    assert response.status_code == 400
    assert stock() == 2
    assert main.get_variant("p1", "Lila", "M")["stock"] == 2


def test_concurrent_orders_share_one_process_lock():
    main.load_products()
    main.load_variants()
    def order(_):
        return TestClient(main.app).post("/api/orders", json={"items": [item()]})
    with ThreadPoolExecutor(max_workers=4) as executor:
        responses = list(executor.map(order, range(4)))
    assert sorted(response.status_code for response in responses) == [200, 200, 400, 400]
    assert stock() == 0
    assert main.get_variant("p1", "Lila", "M")["stock"] == 0


def test_persistence_failure_preserves_previous_stock(monkeypatch):
    original = main.VARIANTS_FILE.read_bytes()
    def fail_replace(*args):
        raise OSError("simulated disk failure")
    monkeypatch.setattr(main.os, "replace", fail_replace)
    with pytest.raises(OSError):
        main.validate_and_reserve([item()])
    assert main.VARIANTS_FILE.read_bytes() == original
    assert main.get_variant("p1", "Lila", "M")["stock"] == 2
    assert not list(main.VARIANTS_FILE.parent.glob(".variants-*.tmp"))
