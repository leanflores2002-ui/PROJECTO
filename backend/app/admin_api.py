from __future__ import annotations

import re
import unicodedata
from decimal import Decimal
from typing import Literal
from uuid import UUID

import bleach
from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg.errors import UniqueViolation
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field, field_validator

from .database import database_connection
from .security import AdminPrincipal, require_admin, require_roles


router = APIRouter(prefix="/api/admin", tags=["admin"])
PRODUCT_STATUSES = ("draft", "published", "hidden")
VARIANT_STATUSES = ("active", "inactive")
ALLOWED_DESCRIPTION_TAGS = ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a"]
ALLOWED_DESCRIPTION_ATTRIBUTES = {"a": ["href", "title", "target", "rel"]}


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")


def sanitize_description(value: str | None) -> str:
    if not value:
        return ""
    return bleach.clean(
        value,
        tags=ALLOWED_DESCRIPTION_TAGS,
        attributes=ALLOWED_DESCRIPTION_ATTRIBUTES,
        protocols=["http", "https", "mailto"],
        strip=True,
    )


class VariantInput(BaseModel):
    id: UUID | None = None
    size: str = Field(min_length=1, max_length=40)
    color: str = Field(min_length=1, max_length=80)
    color_hex: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    stock: int = Field(default=0, ge=0)
    price_override: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    status: Literal["active", "inactive"] = "active"


class ProductWrite(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    slug: str | None = Field(default=None, min_length=2, max_length=200)
    sku: str = Field(min_length=1, max_length=80)
    barcode: str | None = Field(default=None, max_length=80)
    audience: Literal["mujer", "hombre", "ninos"]
    category_id: UUID | None = None
    season_key: str | None = Field(default=None, max_length=80)
    description_html: str = Field(default="", max_length=20_000)
    status: Literal["draft", "published", "hidden"] = "draft"
    base_price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    compare_at_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    tags: list[str] = Field(default_factory=list, max_length=30)
    featured: bool = False
    specifications: dict[str, str] = Field(default_factory=dict)
    collection_ids: list[UUID] = Field(default_factory=list, max_length=50)
    price_groups: dict[str, Decimal] = Field(default_factory=dict)
    variants: list[VariantInput] = Field(default_factory=list, max_length=500)

    @field_validator("price_groups")
    @classmethod
    def validate_price_groups(cls, value: dict[str, Decimal]) -> dict[str, Decimal]:
        if any(key not in {"common", "special", "special2"} for key in value):
            raise ValueError("Grupo de precio no permitido")
        if any(amount < 0 for amount in value.values()):
            raise ValueError("Los precios no pueden ser negativos")
        return value

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, value: list[str]) -> list[str]:
        if any(len(tag.strip()) > 60 for tag in value):
            raise ValueError("Cada tag admite hasta 60 caracteres")
        return value

    @field_validator("specifications")
    @classmethod
    def validate_specifications(cls, value: dict[str, str]) -> dict[str, str]:
        if any(len(str(key)) > 60 or len(str(content)) > 500 for key, content in value.items()):
            raise ValueError("Especificacion demasiado extensa")
        return {str(key): str(content) for key, content in value.items()}


class StockAdjustment(BaseModel):
    stock: int = Field(ge=0)
    reason: str = Field(min_length=3, max_length=300)


def _audit(connection, admin: AdminPrincipal, action: str, entity: str, entity_id: UUID, details: dict) -> None:
    connection.execute(
        """
        insert into public.audit_logs (admin_user_id, action, entity_type, entity_id, details)
        values (%s, %s, %s, %s, %s)
        """,
        (admin.user_id, action, entity, entity_id, Jsonb(details)),
    )


def _validate_relations(connection, payload: ProductWrite) -> None:
    if payload.category_id:
        category = connection.execute(
            "select audience from public.categories where id = %s",
            (payload.category_id,),
        ).fetchone()
        if not category:
            raise HTTPException(status_code=400, detail="La categoria no existe")
        if category["audience"] != payload.audience:
            raise HTTPException(status_code=400, detail="La categoria no corresponde al publico elegido")
    if payload.collection_ids:
        unique_ids = list(dict.fromkeys(payload.collection_ids))
        count = connection.execute(
            "select count(*) as count from public.collections where id = any(%s)",
            (unique_ids,),
        ).fetchone()["count"]
        if count != len(unique_ids):
            raise HTTPException(status_code=400, detail="Una o mas colecciones no existen")


def _replace_product_children(connection, product_id: UUID, payload: ProductWrite, admin: AdminPrincipal) -> None:
    connection.execute("delete from public.collection_products where product_id = %s", (product_id,))
    for position, collection_id in enumerate(dict.fromkeys(payload.collection_ids)):
        connection.execute(
            "insert into public.collection_products (collection_id, product_id, position) values (%s, %s, %s)",
            (collection_id, product_id, position),
        )

    keys = tuple(payload.price_groups.keys())
    if keys:
        connection.execute(
            "delete from public.product_price_groups where product_id = %s and not (price_group = any(%s))",
            (product_id, list(keys)),
        )
    else:
        connection.execute("delete from public.product_price_groups where product_id = %s", (product_id,))
    for group, amount in payload.price_groups.items():
        connection.execute(
            """
            insert into public.product_price_groups (product_id, price_group, amount)
            values (%s, %s, %s)
            on conflict (product_id, price_group) do update set amount = excluded.amount
            """,
            (product_id, group, amount),
        )

    retained_ids: list[UUID] = []
    for variant in payload.variants:
        if variant.id:
            current = connection.execute(
                "select stock from public.product_variants where id = %s and product_id = %s for update",
                (variant.id, product_id),
            ).fetchone()
            if not current:
                raise HTTPException(status_code=400, detail=f"La variante {variant.id} no pertenece al producto")
            connection.execute(
                """
                update public.product_variants
                set size = %s, color = %s, color_hex = %s, stock = %s,
                    price_override = %s, status = %s, updated_at = now()
                where id = %s
                """,
                (
                    variant.size.strip(), variant.color.strip(), variant.color_hex, variant.stock,
                    variant.price_override, variant.status, variant.id,
                ),
            )
            retained_ids.append(variant.id)
            if current["stock"] != variant.stock:
                connection.execute(
                    """
                    insert into public.stock_movements
                        (variant_id, movement_type, quantity_delta, stock_before, stock_after, reason, admin_user_id)
                    values (%s, 'adjustment', %s, %s, %s, 'Edicion de producto', %s)
                    """,
                    (variant.id, variant.stock - current["stock"], current["stock"], variant.stock, admin.user_id),
                )
        else:
            created = connection.execute(
                """
                insert into public.product_variants
                    (product_id, size, color, color_hex, stock, price_override, status)
                values (%s, %s, %s, %s, %s, %s, %s)
                returning id
                """,
                (
                    product_id, variant.size.strip(), variant.color.strip(), variant.color_hex,
                    variant.stock, variant.price_override, variant.status,
                ),
            ).fetchone()
            retained_ids.append(created["id"])
            if variant.stock:
                connection.execute(
                    """
                    insert into public.stock_movements
                        (variant_id, movement_type, quantity_delta, stock_before, stock_after, reason, admin_user_id)
                    values (%s, 'incoming', %s, 0, %s, 'Stock inicial', %s)
                    """,
                    (created["id"], variant.stock, variant.stock, admin.user_id),
                )

    if retained_ids:
        connection.execute(
            """
            update public.product_variants set status = 'inactive', updated_at = now()
            where product_id = %s and not (id = any(%s))
            """,
            (product_id, retained_ids),
        )
    else:
        connection.execute(
            "update public.product_variants set status = 'inactive', updated_at = now() where product_id = %s",
            (product_id,),
        )


def _product_detail(connection, product_id: UUID) -> dict:
    product = connection.execute(
        """
        select p.*, c.name as category_name
        from public.products p
        left join public.categories c on c.id = p.category_id
        where p.id = %s
        """,
        (product_id,),
    ).fetchone()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    product["price_groups"] = {
        row["price_group"]: row["amount"]
        for row in connection.execute(
            "select price_group, amount from public.product_price_groups where product_id = %s order by price_group",
            (product_id,),
        ).fetchall()
    }
    product["variants"] = connection.execute(
        """
        select id, size, color, color_hex, stock, price_override, status, updated_at
        from public.product_variants where product_id = %s order by color, size
        """,
        (product_id,),
    ).fetchall()
    product["collection_ids"] = [
        row["collection_id"]
        for row in connection.execute(
            "select collection_id from public.collection_products where product_id = %s order by position",
            (product_id,),
        ).fetchall()
    ]
    product["images"] = connection.execute(
        """
        select id, source, storage_path, public_url, alt_text, position, is_primary
        from public.product_images where product_id = %s order by position, created_at
        """,
        (product_id,),
    ).fetchall()
    return product


@router.get("/session")
def admin_session(admin: AdminPrincipal = Depends(require_admin)):
    return {
        "userId": admin.user_id,
        "email": admin.email,
        "role": admin.role,
        "displayName": admin.display_name,
    }


@router.get("/dashboard")
def dashboard(admin: AdminPrincipal = Depends(require_admin)):
    del admin
    with database_connection() as connection:
        summary = connection.execute(
            """
            select
                count(*) as total_products,
                count(*) filter (where status = 'published') as published_products,
                count(*) filter (where status = 'draft') as draft_products,
                count(*) filter (where status = 'hidden') as hidden_products,
                count(*) filter (where total_stock = 0) as out_of_stock_products,
                count(*) filter (where total_stock between 1 and 5) as low_stock_products
            from (
                select p.id, p.status, coalesce(sum(v.stock) filter (where v.status = 'active'), 0) as total_stock
                from public.products p
                left join public.product_variants v on v.product_id = p.id
                where p.deleted_at is null
                group by p.id
            ) product_stock
            """
        ).fetchone()
        recent_orders = connection.execute(
            """
            select o.id, o.reference, o.status, o.created_at, coalesce(sum(oi.quantity), 0) as item_count
            from public.orders o
            left join public.order_items oi on oi.order_id = o.id
            group by o.id order by o.created_at desc limit 6
            """
        ).fetchall()
        activity = connection.execute(
            """
            select a.id, a.action, a.entity_type, a.entity_id, a.created_at,
                   coalesce(p.display_name, 'Administrador') as administrator
            from public.audit_logs a
            left join public.admin_profiles p on p.user_id = a.admin_user_id
            order by a.created_at desc limit 8
            """
        ).fetchall()
    return {"summary": summary, "recentOrders": recent_orders, "recentActivity": activity}


@router.get("/categories")
def list_categories(admin: AdminPrincipal = Depends(require_admin)):
    del admin
    with database_connection() as connection:
        return connection.execute(
            """
            select id, name, slug, audience, status, display_order
            from public.categories order by audience, display_order, name
            """
        ).fetchall()


@router.get("/collections")
def list_collections(admin: AdminPrincipal = Depends(require_admin)):
    del admin
    with database_connection() as connection:
        return connection.execute(
            "select id, name, slug, status from public.collections order by name"
        ).fetchall()


@router.get("/products")
def list_products(
    search: str | None = Query(default=None, max_length=120),
    audience: str | None = Query(default=None),
    product_status: str | None = Query(default=None, alias="status"),
    category_id: UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    admin: AdminPrincipal = Depends(require_admin),
):
    del admin
    clauses = ["p.deleted_at is null"]
    values: list = []
    if search:
        clauses.append("(p.name ilike %s or p.sku ilike %s)")
        term = f"%{search.strip()}%"
        values.extend([term, term])
    if audience:
        clauses.append("p.audience = %s")
        values.append(audience)
    if product_status:
        clauses.append("p.status = %s")
        values.append(product_status)
    if category_id:
        clauses.append("p.category_id = %s")
        values.append(category_id)
    where = " and ".join(clauses)
    offset = (page - 1) * page_size
    with database_connection() as connection:
        total = connection.execute(f"select count(*) as count from public.products p where {where}", values).fetchone()["count"]
        rows = connection.execute(
            f"""
            select p.id, p.name, p.slug, p.sku, p.audience, p.season_key, p.status,
                   p.base_price, p.updated_at, c.name as category_name,
                   coalesce(sum(v.stock) filter (where v.status = 'active'), 0) as stock
            from public.products p
            left join public.categories c on c.id = p.category_id
            left join public.product_variants v on v.product_id = p.id
            where {where}
            group by p.id, c.name
            order by p.updated_at desc
            limit %s offset %s
            """,
            [*values, page_size, offset],
        ).fetchall()
    return {"items": rows, "page": page, "pageSize": page_size, "total": total}


@router.get("/products/{product_id}")
def get_product(product_id: UUID, admin: AdminPrincipal = Depends(require_admin)):
    del admin
    with database_connection() as connection:
        return _product_detail(connection, product_id)


@router.post("/products", status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductWrite,
    admin: AdminPrincipal = Depends(require_roles("superadmin", "admin", "operator")),
):
    clean_slug = slugify(payload.slug or payload.name)
    if not clean_slug:
        raise HTTPException(status_code=400, detail="No se pudo generar un slug valido")
    tags = list(dict.fromkeys(tag.strip() for tag in payload.tags if tag.strip()))
    try:
        with database_connection() as connection, connection.transaction():
            _validate_relations(connection, payload)
            product = connection.execute(
                """
                insert into public.products
                    (name, slug, sku, barcode, audience, category_id, season_key, description_html,
                     status, base_price, compare_at_price, tags, featured, specifications, created_by, updated_by)
                values (%s, %s, %s, nullif(%s, ''), %s, %s, nullif(%s, ''), %s,
                        %s, %s, %s, %s, %s, %s, %s, %s)
                returning id
                """,
                (
                    payload.name.strip(), clean_slug, payload.sku.strip(), payload.barcode or "",
                    payload.audience, payload.category_id, payload.season_key or "",
                    sanitize_description(payload.description_html), payload.status, payload.base_price,
                    payload.compare_at_price, tags, payload.featured, Jsonb(payload.specifications),
                    admin.user_id, admin.user_id,
                ),
            ).fetchone()
            _replace_product_children(connection, product["id"], payload, admin)
            _audit(connection, admin, "product.created", "product", product["id"], {"status": payload.status})
            result = _product_detail(connection, product["id"])
        return result
    except UniqueViolation as exc:
        raise HTTPException(status_code=409, detail="El slug o SKU ya existe") from exc


@router.put("/products/{product_id}")
def update_product(
    product_id: UUID,
    payload: ProductWrite,
    admin: AdminPrincipal = Depends(require_roles("superadmin", "admin", "operator")),
):
    tags = list(dict.fromkeys(tag.strip() for tag in payload.tags if tag.strip()))
    try:
        with database_connection() as connection, connection.transaction():
            _validate_relations(connection, payload)
            current = connection.execute(
                "select status, base_price from public.products where id = %s for update", (product_id,)
            ).fetchone()
            if not current:
                raise HTTPException(status_code=404, detail="Producto no encontrado")
            clean_slug = slugify(payload.slug or payload.name)
            connection.execute(
                """
                update public.products
                set name = %s, slug = %s, sku = %s, barcode = nullif(%s, ''), audience = %s,
                    category_id = %s, season_key = nullif(%s, ''), description_html = %s,
                    status = %s, base_price = %s, compare_at_price = %s, tags = %s,
                    featured = %s, specifications = %s, updated_by = %s, updated_at = now()
                where id = %s
                """,
                (
                    payload.name.strip(), clean_slug, payload.sku.strip(), payload.barcode or "",
                    payload.audience, payload.category_id, payload.season_key or "",
                    sanitize_description(payload.description_html), payload.status, payload.base_price,
                    payload.compare_at_price, tags, payload.featured, Jsonb(payload.specifications), admin.user_id, product_id,
                ),
            )
            _replace_product_children(connection, product_id, payload, admin)
            changes = {
                "statusBefore": current["status"], "statusAfter": payload.status,
                "basePriceBefore": str(current["base_price"]), "basePriceAfter": str(payload.base_price),
            }
            _audit(connection, admin, "product.updated", "product", product_id, changes)
            if current["status"] != payload.status:
                _audit(connection, admin, f"product.{payload.status}", "product", product_id, {})
            result = _product_detail(connection, product_id)
        return result
    except UniqueViolation as exc:
        raise HTTPException(status_code=409, detail="El slug o SKU ya existe") from exc


@router.post("/inventory/{variant_id}/adjust")
def adjust_stock(
    variant_id: UUID,
    payload: StockAdjustment,
    admin: AdminPrincipal = Depends(require_roles("superadmin", "admin", "operator")),
):
    with database_connection() as connection, connection.transaction():
        variant = connection.execute(
            "select id, product_id, stock from public.product_variants where id = %s for update",
            (variant_id,),
        ).fetchone()
        if not variant:
            raise HTTPException(status_code=404, detail="Variante no encontrada")
        before = variant["stock"]
        connection.execute(
            "update public.product_variants set stock = %s, updated_at = now() where id = %s",
            (payload.stock, variant_id),
        )
        connection.execute(
            """
            insert into public.stock_movements
                (variant_id, movement_type, quantity_delta, stock_before, stock_after, reason, admin_user_id)
            values (%s, 'adjustment', %s, %s, %s, %s, %s)
            """,
            (variant_id, payload.stock - before, before, payload.stock, payload.reason.strip(), admin.user_id),
        )
        _audit(
            connection, admin, "stock.adjusted", "product_variant", variant_id,
            {"before": before, "after": payload.stock, "reason": payload.reason.strip()},
        )
    return {"variantId": variant_id, "stock": payload.stock}
