from __future__ import annotations

import secrets
from collections import defaultdict
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from .database import database_connection


router = APIRouter(prefix="/api/public", tags=["public"])


class PublicOrderItem(BaseModel):
    productId: str = Field(min_length=1, max_length=200)
    color: str = Field(min_length=1, max_length=80)
    size: str = Field(min_length=1, max_length=40)
    qty: int = Field(ge=1, le=999)


class PublicOrder(BaseModel):
    items: list[PublicOrderItem] = Field(min_length=1, max_length=200)


@router.post("/orders", status_code=status.HTTP_201_CREATED)
def create_public_order(payload: PublicOrder):
    grouped: dict[tuple[str, str, str], int] = defaultdict(int)
    for item in payload.items:
        key = (item.productId.strip(), item.color.strip(), item.size.strip())
        grouped[key] += item.qty

    requested = sorted((*key, quantity) for key, quantity in grouped.items())
    reserved: list[dict] = []
    with database_connection() as connection, connection.transaction():
        for product_reference, color, size, quantity in requested:
            variant = connection.execute(
                """
                select v.id, v.product_id, v.stock, v.color, v.size, p.name,
                       coalesce(v.price_override, pg.amount, p.base_price) as unit_price
                from public.product_variants v
                join public.products p on p.id = v.product_id
                left join public.product_size_price_groups spg
                  on spg.product_id = p.id and spg.size = v.size
                left join public.product_price_groups pg
                  on pg.product_id = p.id and pg.price_group = spg.price_group
                where (p.slug = %s or p.id::text = %s)
                  and lower(v.color) = lower(%s) and lower(v.size) = lower(%s)
                  and p.status = 'published' and p.deleted_at is null and v.status = 'active'
                for update of v
                """,
                (product_reference, product_reference, color, size),
            ).fetchone()
            if not variant:
                raise HTTPException(
                    status_code=400,
                    detail=f"No existe una variante publicada para {product_reference}, {color}, talle {size}",
                )
            if variant["stock"] < quantity:
                raise HTTPException(
                    status_code=409,
                    detail=f"Stock insuficiente para {variant['name']}, {variant['color']}, talle {variant['size']}",
                )
            reserved.append({**variant, "quantity": quantity})

        reference = f"ROM-{secrets.token_hex(5).upper()}"
        order = connection.execute(
            "insert into public.orders (reference, status) values (%s, 'submitted') returning id, created_at",
            (reference,),
        ).fetchone()
        updates: list[dict] = []
        for variant in reserved:
            before = variant["stock"]
            after = before - variant["quantity"]
            connection.execute(
                "update public.product_variants set stock = %s, updated_at = now() where id = %s",
                (after, variant["id"]),
            )
            connection.execute(
                """
                insert into public.order_items
                    (order_id, product_id, variant_id, product_name, color, size, quantity, unit_price)
                values (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    order["id"], variant["product_id"], variant["id"], variant["name"],
                    variant["color"], variant["size"], variant["quantity"], variant["unit_price"],
                ),
            )
            connection.execute(
                """
                insert into public.stock_movements
                    (variant_id, movement_type, quantity_delta, stock_before, stock_after, reason, order_id)
                values (%s, 'order', %s, %s, %s, 'Pedido de catalogo', %s)
                """,
                (variant["id"], -variant["quantity"], before, after, order["id"]),
            )
            updates.append(
                {
                    "productId": str(variant["product_id"]),
                    "color": variant["color"],
                    "size": variant["size"],
                    "stock": after,
                }
            )
    return {
        "orderId": order["id"],
        "reference": reference,
        "createdAt": order["created_at"],
        "updatedVariants": updates,
    }
