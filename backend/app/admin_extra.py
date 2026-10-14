from __future__ import annotations

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg.errors import UniqueViolation
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from .admin_api import slugify
from .database import database_connection
from .inventory_service import InventoryService
from .security import AdminPrincipal, require_admin, require_roles

# This router is mounted inside admin_api.router, which already owns /api/admin.
# Keep this prefix empty to avoid /api/admin/api/admin/... routes.
router = APIRouter(tags=["admin"])


@router.get('/admins')
def list_admins(page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100),
                search: str = Query('', max_length=120),
                admin: AdminPrincipal = Depends(require_roles('superadmin', 'admin'))):
    with database_connection() as connection:
        return connection.execute('''select p.user_id, p.display_name, p.role, p.is_active, u.email
            from public.admin_profiles p join auth.users u on u.id=p.user_id
            where (p.display_name ilike %s or u.email ilike %s)
            order by p.display_name, p.user_id limit %s offset %s''',
            (f'%{search.strip()}%',f'%{search.strip()}%',page_size, (page-1)*page_size)).fetchall()


@router.get('/audit-logs')
def list_audit_logs(page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100),
                    admin: AdminPrincipal = Depends(require_roles('superadmin', 'admin'))):
    with database_connection() as connection:
        return connection.execute('''select id, admin_user_id, action, entity_type, created_at
            from public.audit_logs order by created_at desc, id desc limit %s offset %s''',
            (page_size, (page-1)*page_size)).fetchall()


class CategoryWrite(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    audience: Literal["mujer", "hombre", "ninos"]
    status: Literal["active", "hidden"] = "active"
    display_order: int = Field(default=0, ge=0, le=10000)


class CollectionWrite(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    status: Literal["active", "hidden"] = "active"
    description: str | None = Field(default=None, max_length=2000)


class OrderStatusWrite(BaseModel):
    status: Literal["submitted", "confirmed", "prepared", "completed", "cancelled"]


def _audit(connection, admin: AdminPrincipal, action: str, entity_type: str, entity_id: UUID, details: dict) -> None:
    connection.execute(
        """
        insert into public.audit_logs (admin_user_id, action, entity_type, entity_id, details)
        values (%s, %s, %s, %s, %s)
        """,
        (admin.user_id, action, entity_type, entity_id, Jsonb(details)),
    )


@router.post("/categories", status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryWrite,
    admin: AdminPrincipal = Depends(require_roles("superadmin", "admin", "operator")),
):
    clean_slug = slugify(payload.name.strip())
    if not clean_slug:
        raise HTTPException(status_code=400, detail="No se pudo generar un slug valido")
    try:
        with database_connection() as connection, connection.transaction():
            row = connection.execute(
                """
                insert into public.categories (name, slug, audience, status, display_order)
                values (%s, %s, %s, %s, %s)
                returning id, name, slug, audience, status, display_order
                """,
                (payload.name.strip(), clean_slug, payload.audience, payload.status, payload.display_order),
            ).fetchone()
            _audit(connection, admin, "category.created", "category", row["id"], {"name": row["name"]})
        return row
    except UniqueViolation as exc:
        raise HTTPException(status_code=409, detail="Ya existe esa categoria para el publico elegido") from exc


@router.put("/categories/{category_id}")
def update_category(
    category_id: UUID,
    payload: CategoryWrite,
    admin: AdminPrincipal = Depends(require_roles("superadmin", "admin", "operator")),
):
    clean_slug = slugify(payload.name.strip())
    try:
        with database_connection() as connection, connection.transaction():
            current = connection.execute(
                "select id from public.categories where id = %s for update", (category_id,)
            ).fetchone()
            if not current:
                raise HTTPException(status_code=404, detail="Categoria no encontrada")
            row = connection.execute(
                """
                update public.categories
                set name = %s, slug = %s, audience = %s, status = %s, display_order = %s, updated_at = now()
                where id = %s
                returning id, name, slug, audience, status, display_order
                """,
                (payload.name.strip(), clean_slug, payload.audience, payload.status, payload.display_order, category_id),
            ).fetchone()
            _audit(connection, admin, "category.updated", "category", category_id, {"name": row["name"], "status": row["status"]})
        return row
    except UniqueViolation as exc:
        raise HTTPException(status_code=409, detail="Ya existe esa categoria para el publico elegido") from exc


@router.post("/collections", status_code=status.HTTP_201_CREATED)
def create_collection(
    payload: CollectionWrite,
    admin: AdminPrincipal = Depends(require_roles("superadmin", "admin", "operator")),
):
    clean_slug = slugify(payload.name.strip())
    if not clean_slug:
        raise HTTPException(status_code=400, detail="No se pudo generar un slug valido")
    try:
        with database_connection() as connection, connection.transaction():
            row = connection.execute(
                """
                insert into public.collections (name, slug, status, description)
                values (%s, %s, %s, %s)
                returning id, name, slug, status, description
                """,
                (payload.name.strip(), clean_slug, payload.status, payload.description),
            ).fetchone()
            _audit(connection, admin, "collection.created", "collection", row["id"], {"name": row["name"]})
        return row
    except UniqueViolation as exc:
        raise HTTPException(status_code=409, detail="Ya existe una coleccion con ese nombre") from exc


@router.put("/collections/{collection_id}")
def update_collection(
    collection_id: UUID,
    payload: CollectionWrite,
    admin: AdminPrincipal = Depends(require_roles("superadmin", "admin", "operator")),
):
    clean_slug = slugify(payload.name.strip())
    try:
        with database_connection() as connection, connection.transaction():
            current = connection.execute(
                "select id from public.collections where id = %s for update", (collection_id,)
            ).fetchone()
            if not current:
                raise HTTPException(status_code=404, detail="Coleccion no encontrada")
            row = connection.execute(
                """
                update public.collections
                set name = %s, slug = %s, status = %s, description = %s, updated_at = now()
                where id = %s
                returning id, name, slug, status, description
                """,
                (payload.name.strip(), clean_slug, payload.status, payload.description, collection_id),
            ).fetchone()
            _audit(connection, admin, "collection.updated", "collection", collection_id, {"name": row["name"], "status": row["status"]})
        return row
    except UniqueViolation as exc:
        raise HTTPException(status_code=409, detail="Ya existe una coleccion con ese nombre") from exc


@router.get("/orders")
def list_orders(admin: AdminPrincipal = Depends(require_admin)):
    del admin
    with database_connection() as connection:
        return connection.execute(
            """
            select o.id, o.reference, o.status, o.notes, o.created_at, o.updated_at,
                   coalesce(sum(oi.quantity), 0) as item_count,
                   coalesce(sum(oi.quantity * oi.unit_price), 0) as total
            from public.orders o
            left join public.order_items oi on oi.order_id = o.id
            group by o.id
            order by o.created_at desc
            limit 250
            """
        ).fetchall()


@router.get("/orders/{order_id}")
def get_order(order_id: UUID, admin: AdminPrincipal = Depends(require_admin)):
    del admin
    with database_connection() as connection:
        order = connection.execute(
            "select id, reference, status, notes, created_at, updated_at from public.orders where id = %s",
            (order_id,),
        ).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        order["items"] = connection.execute(
            """
            select id, product_name, color, size, quantity, unit_price,
                   quantity * unit_price as subtotal
            from public.order_items
            where order_id = %s
            order by created_at, id
            """,
            (order_id,),
        ).fetchall()
        return order


@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: UUID,
    payload: OrderStatusWrite,
    admin: AdminPrincipal = Depends(require_roles("superadmin", "admin", "operator")),
):
    with database_connection() as connection, connection.transaction():
        current = connection.execute(
            "select status from public.orders where id = %s for update", (order_id,)
        ).fetchone()
        if not current:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        if current['status'] == payload.status:
            return {'id': order_id, 'status': payload.status}
        if current['status'] == 'cancelled':
            raise HTTPException(409, 'El pedido cancelado ya libero stock. Crea un pedido nuevo.')
        if payload.status == 'cancelled':
            InventoryService.release_stock(connection, order_id, admin.user_id)
        connection.execute(
            "update public.orders set status = %s, updated_at = now() where id = %s",
            (payload.status, order_id),
        )
        _audit(
            connection,
            admin,
            "order.status_updated",
            "order",
            order_id,
            {"before": current["status"], "after": payload.status},
        )
    return {"id": order_id, "status": payload.status}
