from uuid import uuid4

from fastapi.testclient import TestClient

from backend.app import main
from backend.app.admin_api import ProductWrite, sanitize_description
from backend.app.security import AdminPrincipal, require_admin
from pydantic import ValidationError
import pytest


def test_admin_endpoint_rejects_anonymous_user():
    client = TestClient(main.app)
    response = client.get("/api/admin/session")
    assert response.status_code == 401


def test_admin_session_returns_server_validated_profile():
    principal = AdminPrincipal(
        user_id=uuid4(),
        email="admin@example.test",
        role="admin",
        display_name="Admin ROMIX",
    )
    main.app.dependency_overrides[require_admin] = lambda: principal
    try:
        client = TestClient(main.app)
        response = client.get("/api/admin/session")
    finally:
        main.app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["role"] == "admin"
    assert response.json()["displayName"] == "Admin ROMIX"


def test_product_payload_rejects_negative_group_price():
    with pytest.raises(ValidationError):
        ProductWrite(
            name="Producto ROMIX",
            sku="SKU-1",
            audience="mujer",
            base_price=100,
            price_groups={"common": -1},
        )


def test_product_description_removes_scripts():
    clean = sanitize_description('<p>Detalle <strong>ROMIX</strong></p><script>alert(1)</script>')
    assert "<script" not in clean
    assert "<strong>ROMIX</strong>" in clean
