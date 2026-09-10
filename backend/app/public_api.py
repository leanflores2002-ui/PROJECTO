from __future__ import annotations

import secrets
import hashlib
import json
from collections import defaultdict
from pathlib import Path
from urllib.parse import quote
from uuid import UUID, uuid4

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from .catalog_sync import _build_catalog
from .config import get_settings
from .database import database_connection
from .inventory_service import InventoryService
from .security import AdminPrincipal, require_admin


router = APIRouter(prefix="/api/public", tags=["public"])
_IMAGE_BUCKET = "product-images"
_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif"}
_MAX_IMAGE_BYTES = 10 * 1024 * 1024


class PublicOrderItem(BaseModel):
    productId: str = Field(min_length=1, max_length=200)
    color: str = Field(min_length=1, max_length=80)
    size: str = Field(min_length=1, max_length=40)
    qty: int = Field(ge=1, le=999)


class PublicOrder(BaseModel):
    request_key: UUID
    items: list[PublicOrderItem] = Field(min_length=1, max_length=200)


def _storage_settings():
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="Supabase Storage no esta configurado en el backend")
    return settings


def _storage_headers(content_type: str | None = None) -> dict[str, str]:
    settings = _storage_settings()
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
    }
    if content_type:
        headers["Content-Type"] = content_type
        headers["x-upsert"] = "false"
    return headers


def _public_storage_url(path: str) -> str:
    settings = _storage_settings()
    encoded = quote(path, safe="/")
    return f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/{_IMAGE_BUCKET}/{encoded}"


def _delete_storage_object(path: str) -> None:
    settings = _storage_settings()
    encoded = quote(path, safe="/")
    url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{_IMAGE_BUCKET}/{encoded}"
    try:
        response = httpx.delete(url, headers=_storage_headers(), timeout=20.0)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="No se pudo contactar Supabase Storage") from exc
    if response.status_code not in {200, 204, 404}:
        raise HTTPException(status_code=502, detail="Supabase Storage rechazo la eliminacion de la imagen")


def _product_images(connection, product_id: UUID) -> list[dict]:
    return connection.execute(
        """
        select id, source, storage_path, public_url, alt_text, position, is_primary, mime_type, size_bytes
        from public.product_images
        where product_id = %s
        order by position, created_at
        """,
        (product_id,),
    ).fetchall()


def _find_product_by_sku(connection, sku: str) -> dict:
    product = connection.execute(
        "select id, name, sku from public.products where lower(sku) = lower(%s) and deleted_at is null",
        (sku.strip(),),
    ).fetchone()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


@router.get("/catalog")
def public_catalog():
    """Catalogo publicado en el formato compatible con la tienda historica."""
    with database_connection() as connection:
        return _build_catalog(connection)


@router.post("/admin/products/by-sku/{sku}/images")
async def upload_product_images(
    sku: str,
    files: list[UploadFile] = File(...),
    admin: AdminPrincipal = Depends(require_admin),
):
    del admin
    if not files or len(files) > 12:
        raise HTTPException(status_code=400, detail="Selecciona entre 1 y 12 imagenes")

    uploaded: list[tuple[str, str, str, int]] = []
    with database_connection() as connection, connection.transaction():
        product = _find_product_by_sku(connection, sku)
        current_count = connection.execute(
            "select count(*) as count from public.product_images where product_id = %s",
            (product["id"],),
        ).fetchone()["count"]
        make_first_primary = current_count == 0

        for position_offset, file in enumerate(files):
            mime_type = (file.content_type or "").lower()
            if mime_type not in _ALLOWED_IMAGE_TYPES:
                raise HTTPException(status_code=400, detail=f"Formato no permitido: {file.filename or 'archivo'}")
            content = await file.read(_MAX_IMAGE_BYTES + 1)
            if len(content) > _MAX_IMAGE_BYTES:
                raise HTTPException(status_code=413, detail=f"{file.filename or 'Imagen'} supera 10 MB")
            suffix = Path(file.filename or "image").suffix.lower()
            if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".avif"}:
                suffix = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif"}[mime_type]
            storage_path = f"{product['id']}/{uuid4().hex}{suffix}"
            settings = _storage_settings()
            encoded = quote(storage_path, safe="/")
            url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{_IMAGE_BUCKET}/{encoded}"
            try:
                response = httpx.post(url, headers=_storage_headers(mime_type), content=content, timeout=30.0)
            except httpx.HTTPError as exc:
                for path, *_rest in uploaded:
                    try:
                        _delete_storage_object(path)
                    except HTTPException:
                        pass
                raise HTTPException(status_code=502, detail="No se pudo contactar Supabase Storage") from exc
            if response.status_code not in {200, 201}:
                for path, *_rest in uploaded:
                    try:
                        _delete_storage_object(path)
                    except HTTPException:
                        pass
                raise HTTPException(status_code=502, detail="Supabase Storage rechazo la imagen")

            public_url = _public_storage_url(storage_path)
            position = current_count + position_offset
            is_primary = make_first_primary and position_offset == 0
            connection.execute(
                """
                insert into public.product_images
                    (product_id, source, storage_path, public_url, alt_text, position, is_primary, mime_type, size_bytes)
                values (%s, 'storage', %s, %s, %s, %s, %s, %s, %s)
                """,
                (product["id"], storage_path, public_url, product["name"], position, is_primary, mime_type, len(content)),
            )
            uploaded.append((storage_path, public_url, mime_type, len(content)))

        connection.execute("update public.products set updated_at = now() where id = %s", (product["id"],))
        return {"productId": product["id"], "images": _product_images(connection, product["id"])}


@router.post("/admin/product-images/{image_id}/primary")
def set_primary_product_image(
    image_id: UUID,
    admin: AdminPrincipal = Depends(require_admin),
):
    del admin
    with database_connection() as connection, connection.transaction():
        image = connection.execute(
            "select id, product_id from public.product_images where id = %s for update",
            (image_id,),
        ).fetchone()
        if not image:
            raise HTTPException(status_code=404, detail="Imagen no encontrada")
        connection.execute("update public.product_images set is_primary = false where product_id = %s", (image["product_id"],))
        connection.execute("update public.product_images set is_primary = true where id = %s", (image_id,))
        connection.execute("update public.products set updated_at = now() where id = %s", (image["product_id"],))
        return {"images": _product_images(connection, image["product_id"])}


@router.delete("/admin/product-images/{image_id}")
def delete_product_image(
    image_id: UUID,
    admin: AdminPrincipal = Depends(require_admin),
):
    del admin
    with database_connection() as connection, connection.transaction():
        image = connection.execute(
            "select id, product_id, source, storage_path, is_primary from public.product_images where id = %s for update",
            (image_id,),
        ).fetchone()
        if not image:
            raise HTTPException(status_code=404, detail="Imagen no encontrada")
        if image["source"] == "storage" and image["storage_path"]:
            _delete_storage_object(image["storage_path"])
        connection.execute("delete from public.product_images where id = %s", (image_id,))
        if image["is_primary"]:
            replacement = connection.execute(
                "select id from public.product_images where product_id = %s order by position, created_at limit 1",
                (image["product_id"],),
            ).fetchone()
            if replacement:
                connection.execute("update public.product_images set is_primary = true where id = %s", (replacement["id"],))
        connection.execute("update public.products set updated_at = now() where id = %s", (image["product_id"],))
        return {"images": _product_images(connection, image["product_id"])}


def _order_result(connection, order):
    items = connection.execute("""
        select coalesce(p.legacy_id,p.slug) as "productId", i.product_name as name,
               i.color, i.size, i.quantity as qty, i.unit_price as price,
               v.stock, v.id as "variantId"
        from public.order_items i join public.products p on p.id=i.product_id
        join public.product_variants v on v.id=i.variant_id
        where i.order_id=%s order by v.id
    """, (order['id'],)).fetchall()
    return {'orderId': order['id'], 'reference': order['reference'], 'createdAt': order['created_at'],
            'items': items, 'updatedVariants': items}


@router.post('/orders', status_code=201)
def create_public_order(payload: PublicOrder):
    signature = hashlib.sha256(json.dumps(sorted(
        (i.productId.strip(), i.color.strip().casefold(), i.size.strip().casefold(), i.qty)
        for i in payload.items), ensure_ascii=True).encode()).hexdigest()
    with database_connection() as connection, connection.transaction():
        # Serialize retries before resolving rows. No stock is changed twice on a network retry.
        connection.execute('select pg_advisory_xact_lock(hashtextextended(%s,0))', (str(payload.request_key),))
        previous = connection.execute('select * from public.orders where request_key=%s', (payload.request_key,)).fetchone()
        if previous:
            if previous['request_hash'] != signature:
                raise HTTPException(409, 'La clave del pedido ya fue usada con otros productos')
            return _order_result(connection, previous)
        quantities = defaultdict(int)
        for item in payload.items:
            row = connection.execute("""
                select v.id from public.product_variants v join public.products p on p.id=v.product_id
                where (p.slug=%s or p.legacy_id=%s or p.id::text=%s)
                  and lower(v.color)=lower(%s) and lower(v.size)=lower(%s)
                  and p.status='published' and p.deleted_at is null and v.status='active'
            """, (item.productId.strip(),)*3 + (item.color.strip(),item.size.strip())).fetchone()
            if not row:
                raise HTTPException(404, 'Producto o variante no disponible')
            quantities[row['id']] += item.qty
        reserved = []
        # Canonical UUID ordering also handles aliases and case differences safely.
        for variant_id in sorted(quantities, key=str):
            variant = connection.execute("""
                select v.id,v.product_id,v.stock,v.color,v.size,p.name,
                  coalesce(v.price_override,pg.amount,p.base_price) as unit_price
                from public.product_variants v join public.products p on p.id=v.product_id
                left join public.product_size_price_groups spg on spg.product_id=p.id and spg.size=v.size
                left join public.product_price_groups pg on pg.product_id=p.id and pg.price_group=spg.price_group
                where v.id=%s and v.status='active' and p.status='published' and p.deleted_at is null
                for update of v
            """, (variant_id,)).fetchone()
            if not variant:
                raise HTTPException(409, 'La variante cambio. Revisa el pedido.')
            quantity = quantities[variant_id]
            if variant['stock'] < quantity:
                raise HTTPException(409, 'Stock insuficiente para ' + variant['name'])
            reserved.append({**variant, 'quantity': quantity})
        order = connection.execute("""
            insert into public.orders(reference,status,request_key,request_hash)
            values (%s,'submitted',%s,%s) returning id,reference,created_at
        """, ('ROM-'+secrets.token_hex(5).upper(),payload.request_key,signature)).fetchone()
        for variant in reserved:
            before, after = variant['stock'], variant['stock']-variant['quantity']
            connection.execute('update public.product_variants set stock=%s,updated_at=now() where id=%s', (after,variant['id']))
            connection.execute("""
                insert into public.order_items(order_id,product_id,variant_id,product_name,color,size,quantity,unit_price)
                values (%s,%s,%s,%s,%s,%s,%s,%s)
            """, (order['id'],variant['product_id'],variant['id'],variant['name'],variant['color'],variant['size'],variant['quantity'],variant['unit_price']))
            InventoryService.record_movement(connection,variant['id'],before,after,'Pedido de catalogo','order',order_id=order['id'])
        return _order_result(connection,order)


class ProductView(BaseModel):
    event_key: UUID


@router.post('/products/{product_id}/view', status_code=202)
def record_product_view(product_id: UUID, payload: ProductView):
    with database_connection() as connection:
        row = connection.execute("""
            insert into public.product_view_events(product_id,event_key)
            select id,%s from public.products where id=%s and status='published' and deleted_at is null
            on conflict(event_key) do nothing returning id
        """, (payload.event_key,product_id)).fetchone()
    return {'recorded': bool(row)}
