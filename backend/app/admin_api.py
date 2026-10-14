from __future__ import annotations

import re
import unicodedata
import json
from pathlib import Path
from html import escape
from decimal import Decimal
from datetime import datetime, date
from typing import Literal
from uuid import UUID

import bleach
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from psycopg.errors import UniqueViolation
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field, field_validator, model_validator

from .database import database_connection
from .inventory_service import InventoryService
from .statistics_service import StatisticsService
from .catalog_sync import _build_catalog
from .config import get_settings
from .media_paths import resolve_image_path
from .product_schemas import AdminProductDetail, ProductDetail
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
    stock: int | None = Field(default=None, ge=0)
    sku: str | None = Field(default=None, max_length=80)
    barcode: str | None = Field(default=None, max_length=80)
    low_stock_threshold: int = Field(default=3, ge=0)
    updated_at: datetime | None = None
    price_override: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    status: Literal["active", "inactive"] = "active"

    @field_validator('sku', 'barcode', mode='before')
    @classmethod
    def optional_identifier(cls, value):
        return str(value).strip() or None if value is not None else None

    @field_validator('size', 'color')
    @classmethod
    def required_option(cls, value):
        value = value.strip()
        if not value:
            raise ValueError('Color y talle no pueden estar vacíos')
        return value


class ProductWrite(BaseModel):
    expected_updated_at: datetime | None = None
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
    operation: Literal['set', 'add', 'remove'] = 'set'
    stock: int | None = Field(default=None, ge=0)
    quantity: int | None = Field(default=None, gt=0)
    reason: str = Field(min_length=3, max_length=300)
    movement_type: Literal['incoming', 'outgoing', 'adjustment', 'cancellation'] = 'adjustment'
    expected_updated_at: datetime

    @model_validator(mode='after')
    def validate_adjustment(self):
        self.reason = self.reason.strip()
        if len(self.reason) < 3:
            raise ValueError('Ingres? un motivo de al menos tres caracteres')
        if self.operation == 'set' and self.stock is None:
            raise ValueError('Indic? el stock final')
        if self.operation != 'set' and self.quantity is None:
            raise ValueError('Indic? la cantidad a agregar o quitar')
        return self


class ImageOrder(BaseModel):
    image_ids: list[UUID] = Field(min_length=1, max_length=100)
    expected_updated_at: datetime


@router.patch('/products/{product_id}/images')
def reorder_images(product_id: UUID, payload: ImageOrder, admin: AdminPrincipal = Depends(require_roles('superadmin','admin','operator'))):
    with database_connection() as connection, connection.transaction():
        product = connection.execute('select updated_at from public.products where id=%s for update', (product_id,)).fetchone()
        if not product:
            raise HTTPException(404, 'Producto no encontrado')
        if product['updated_at'] != payload.expected_updated_at:
            raise HTTPException(409, 'Las imágenes cambiaron. Recargá el producto.')
        current = connection.execute('select id from public.product_images where product_id=%s order by position,created_at for update', (product_id,)).fetchall()
        if len(payload.image_ids) != len(current) or len(set(payload.image_ids)) != len(current) or set(payload.image_ids) != {row['id'] for row in current}:
            raise HTTPException(422, 'La lista debe contener cada imagen del producto una sola vez')
        for position, image_id in enumerate(payload.image_ids):
            connection.execute('update public.product_images set position=%s where id=%s', (position,image_id))
        connection.execute('update public.products set updated_at=now() where id=%s', (product_id,))
        _audit(connection,admin,'product.images_reordered','product',product_id,
               {'before':[str(row['id']) for row in current],'after':[str(value) for value in payload.image_ids]})
        return _product_detail(connection,product_id)


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

    existing = {row['id']: row for row in connection.execute(
        'select id,stock,updated_at,status from public.product_variants where product_id=%s order by id for update',
        (product_id,),
    ).fetchall()}
    retained_ids: list[UUID] = []
    for variant in payload.variants:
        if variant.id:
            current = existing.get(variant.id)
            if not current:
                raise HTTPException(status_code=400, detail=f"La variante {variant.id} no pertenece al producto")
            if variant.stock is not None:
                raise HTTPException(422, 'Usa Inventario para modificar stock de una variante existente')
            if variant.updated_at != current['updated_at']:
                raise HTTPException(409, 'La variante cambio. Recarga el producto antes de guardar.')
            connection.execute(
                """
                update public.product_variants
                set size = %s, color = %s, color_hex = %s, sku = %s, barcode = %s, low_stock_threshold = %s,
                    price_override = %s, status = %s, updated_at = now()
                where id = %s
                """,
                (
                    variant.size.strip(), variant.color.strip(), variant.color_hex, variant.sku, variant.barcode, variant.low_stock_threshold,
                    variant.price_override, variant.status, variant.id,
                ),
            )
            if current['status'] != variant.status:
                _audit(connection,admin,'variant.status_changed','product_variant',variant.id,{'before':current['status'],'after':variant.status})
            retained_ids.append(variant.id)
        else:
            created = connection.execute(
                """
                insert into public.product_variants
                    (product_id, size, color, color_hex, stock, price_override, status, sku, barcode, low_stock_threshold)
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                returning id
                """,
                (
                    product_id, variant.size.strip(), variant.color.strip(), variant.color_hex,
                    variant.stock or 0, variant.price_override, variant.status, variant.sku, variant.barcode, variant.low_stock_threshold,
                ),
            ).fetchone()
            _audit(connection,admin,'variant.created','product_variant',created['id'],{'color':variant.color,'size':variant.size,'stock':variant.stock or 0})
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

    for variant_id, previous in existing.items():
        if variant_id not in retained_ids and previous['status'] == 'active':
            _audit(connection,admin,'variant.status_changed','product_variant',variant_id,{'before':'active','after':'inactive'})
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
        select id, sku, barcode, low_stock_threshold, size, color, color_hex, stock, price_override, status, updated_at
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
    for image in product['images']:
        image['public_url'] = resolve_image_path(image['public_url'])
    return product


@router.get("/session")
def admin_session(admin: AdminPrincipal = Depends(require_admin)):
    return {
        "userId": admin.user_id,
        "email": admin.email,
        "role": admin.role,
        "displayName": admin.display_name,
    }


@router.get('/dashboard')
def dashboard(start: date | None = None, end: date | None = None, admin: AdminPrincipal = Depends(require_admin)):
    with database_connection() as connection:
        return StatisticsService.dashboard(connection, start, end)


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
                   (select i.public_url from public.product_images i where i.product_id=p.id
                    order by i.is_primary desc, i.position, i.created_at limit 1) as image_url,
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
    for row in rows:
        row['image_url'] = resolve_image_path(row['image_url'])
    return {"items": rows, "page": page, "pageSize": page_size, "total": total}


@router.get("/products/{product_id}", response_model=AdminProductDetail)
def get_product(product_id: UUID, admin: AdminPrincipal = Depends(require_admin)):
    del admin
    with database_connection() as connection:
        return _product_detail(connection, product_id)


@router.get('/products/{product_id}/preview')
def preview_product(product_id: UUID, request: Request, admin: AdminPrincipal = Depends(require_admin)):
    with database_connection() as connection:
        products = _build_catalog(connection, str(product_id), include_unpublished=True)
    if not products:
        raise HTTPException(404, 'Producto no encontrado')
    product = ProductDetail(**products[0]).model_dump(mode='json')
    document = (Path(__file__).resolve().parents[2] / 'frontend/public/product.html').read_text(encoding='utf-8')
    origin = get_settings().public_frontend_origin or str(request.base_url).rstrip('/')
    payload = json.dumps(product, ensure_ascii=True).replace('<', '\\u003c')
    # Opaque sandbox frames cannot access browser storage; provide disposable storage
    # so the unchanged storefront helpers work without access to the admin session.
    storage_shim = """for(const key of ['localStorage','sessionStorage']) {
      const values=new Map(); Object.defineProperty(window,key,{value:{
        getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),
        removeItem:k=>values.delete(k),clear:()=>values.clear()}});
    }"""
    bootstrap = f'<base href="{escape(origin, quote=True)}/"><script>{storage_shim}window.ROMIX_PRODUCT_PREVIEW={payload};</script>'
    document = re.sub(r'<link[^>]*as="fetch"[^>]*>', '', document)
    # The optional shell module cannot import across an opaque sandbox origin.
    # Core product rendering and icons use the existing classic scripts.
    document = re.sub(r'<script[^>]*type="module"[^>]*>\s*</script>', '', document)
    return {'html': document.replace('<head>', '<head>'+bootstrap, 1)}


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
                "select status, base_price, updated_at, name, description_html, specifications from public.products where id = %s and deleted_at is null for update", (product_id,)
            ).fetchone()
            if not current:
                raise HTTPException(status_code=404, detail="Producto no encontrado")
            if payload.expected_updated_at != current["updated_at"]:
                raise HTTPException(409, "El producto cambio. Recarga antes de guardar.")
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
                'nameBefore':current['name'],'nameAfter':payload.name.strip(),
                'descriptionBefore':current['description_html'],'descriptionAfter':sanitize_description(payload.description_html),
                'specificationsBefore':current['specifications'],'specificationsAfter':payload.specifications,
                "statusBefore": current["status"], "statusAfter": payload.status,
                "basePriceBefore": str(current["base_price"]), "basePriceAfter": str(payload.base_price),
            }
            changes['savedFields'] = payload.model_dump(mode='json', exclude={'expected_updated_at'})
            changes['savedFields']['description_html'] = sanitize_description(payload.description_html)
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
        result = InventoryService.adjust_stock(connection, variant_id, payload, admin.user_id)
        _audit(connection, admin, 'stock.adjusted', 'product_variant', variant_id,
               {'before': result['stockBefore'], 'after': result['stock'], 'reason': payload.reason})
        return result


# Existing category/collection/order handlers; keep one implementation per operation.
from .admin_extra import router as extra_router  # noqa: E402
router.include_router(extra_router)
