from __future__ import annotations

import json
import os
import re
from decimal import Decimal
from html import unescape
from pathlib import Path
from threading import RLock
from typing import Any

from .config import get_settings


ROOT = Path(__file__).resolve().parents[2]
CATALOG_FILE = Path(
    os.environ.get(
        "ROMIX_PRODUCTS_FILE",
        ROOT / "frontend" / "public" / "assets" / "data" / "products.json",
    )
)
_DATABASE_SOURCES = {"database", "db", "postgres", "postgresql", "supabase"}

_sync_lock = RLock()
_last_marker: tuple[Any, ...] | None = None


def _number(value: Any) -> int | float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        value = float(value)
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, (int, float)):
        return value
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return int(parsed) if parsed.is_integer() else parsed


def _plain_text(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", raw, flags=re.IGNORECASE)
    text = re.sub(r"</p\s*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", unescape(text)).strip()


def _json_dict(value: Any) -> dict:
    if isinstance(value, dict):
        return dict(value)
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return dict(parsed) if isinstance(parsed, dict) else {}
    return {}


def _marker(connection) -> tuple[Any, ...]:
    row = connection.execute(
        """
        select
          (select count(*) from public.products where deleted_at is null) as product_count,
          (select max(updated_at) from public.products where deleted_at is null) as product_updated_at,
          (select max(updated_at) from public.product_variants) as variant_updated_at,
          (select count(*) from public.product_images) as image_count,
          (select count(*) from public.product_price_groups) as price_group_count,
          (select count(*) from public.product_size_price_groups) as size_price_group_count
        """
    ).fetchone()
    return (
        row["product_count"],
        row["product_updated_at"],
        row["variant_updated_at"],
        row["image_count"],
        row["price_group_count"],
        row["size_price_group_count"],
    )


def _ordered_names(preferred: list[Any], available: list[str], key: str | None = None) -> list[str]:
    available_map = {str(value).strip().lower(): str(value).strip() for value in available if str(value).strip()}
    result: list[str] = []
    seen: set[str] = set()
    for entry in preferred:
        raw = entry.get(key) if key and isinstance(entry, dict) else entry
        name = str(raw or "").strip()
        normalized = name.lower()
        if normalized in available_map and normalized not in seen:
            result.append(available_map[normalized])
            seen.add(normalized)
    for name in available:
        normalized = str(name).strip().lower()
        if normalized and normalized not in seen:
            result.append(str(name).strip())
            seen.add(normalized)
    return result


def _build_catalog(connection) -> list[dict]:
    products = connection.execute(
        """
        select
          p.id, p.legacy_id, p.name, p.slug, p.sku, p.barcode, p.audience,
          p.season_key, p.description_html, p.base_price, p.compare_at_price,
          p.tags, p.featured, p.specifications, p.legacy_payload,
          c.name as category_name, c.slug as category_slug
        from public.products p
        left join public.categories c on c.id = p.category_id
        where p.status = 'published' and p.deleted_at is null
        order by p.name asc
        """
    ).fetchall()
    if not products:
        return []

    product_ids = [row["id"] for row in products]

    price_groups: dict[str, dict[str, Any]] = {}
    for row in connection.execute(
        """
        select product_id, price_group, amount
        from public.product_price_groups
        where product_id = any(%s)
        order by product_id, price_group
        """,
        (product_ids,),
    ).fetchall():
        price_groups.setdefault(str(row["product_id"]), {})[row["price_group"]] = _number(row["amount"])

    size_groups: dict[str, dict[str, list[str]]] = {}
    for row in connection.execute(
        """
        select product_id, size, price_group
        from public.product_size_price_groups
        where product_id = any(%s)
        order by product_id, size
        """,
        (product_ids,),
    ).fetchall():
        grouped = size_groups.setdefault(str(row["product_id"]), {})
        grouped.setdefault(row["price_group"], []).append(str(row["size"]))

    images: dict[str, list[dict]] = {}
    for row in connection.execute(
        """
        select product_id, public_url, alt_text, position, is_primary
        from public.product_images
        where product_id = any(%s)
        order by product_id, position, created_at
        """,
        (product_ids,),
    ).fetchall():
        images.setdefault(str(row["product_id"]), []).append(dict(row))

    variants: dict[str, list[dict]] = {}
    for row in connection.execute(
        """
        select id, product_id, size, color, color_hex, stock, low_stock_threshold,
               price_override, status
        from public.product_variants
        where product_id = any(%s) and status = 'active'
        order by product_id, color, size
        """,
        (product_ids,),
    ).fetchall():
        variants.setdefault(str(row["product_id"]), []).append(dict(row))

    catalog: list[dict] = []
    for row in products:
        pid = str(row["id"])
        legacy = _json_dict(row.get("legacy_payload"))
        item = dict(legacy)
        product_variants = variants.get(pid, [])
        product_images = images.get(pid, [])

        available_colors = list(dict.fromkeys(str(v["color"]).strip() for v in product_variants if str(v["color"]).strip()))
        color_order = _ordered_names(legacy.get("colors") or [], available_colors, key="name")
        color_hex = {
            str(v["color"]).strip().lower(): v.get("color_hex")
            for v in product_variants
            if str(v.get("color") or "").strip()
        }
        colors = [
            {"name": name, **({"hex": color_hex.get(name.lower())} if color_hex.get(name.lower()) else {})}
            for name in color_order
        ]

        available_sizes = list(dict.fromkeys(str(v["size"]).strip() for v in product_variants if str(v["size"]).strip()))
        size_order = _ordered_names(legacy.get("sizes") or [], available_sizes, key="size")
        sizes: list[dict] = []
        for size in size_order:
            size_variants = [v for v in product_variants if str(v["size"]).strip().lower() == size.lower()]
            total_stock = sum(int(v.get("stock") or 0) for v in size_variants)
            threshold = max((int(v.get("low_stock_threshold") or 0) for v in size_variants), default=0)
            if total_stock <= 0:
                stock_status = "out_of_stock"
            elif total_stock <= max(1, threshold):
                stock_status = "low_stock"
            else:
                stock_status = "available"
            sizes.append({"size": size, "status": stock_status, "stock": total_stock})

        image_urls = [str(image.get("public_url") or "").strip() for image in product_images]
        image_urls = [url for url in image_urls if url]
        primary = next(
            (str(image.get("public_url") or "").strip() for image in product_images if image.get("is_primary")),
            image_urls[0] if image_urls else str(legacy.get("image") or "").strip(),
        )

        item.update(
            {
                "id": str(row.get("legacy_id") or row["slug"]),
                "slug": row["slug"],
                "name": row["name"],
                "section": row["audience"],
                "type": row.get("category_name") or legacy.get("type") or "",
                "categorySlug": row.get("category_slug") or "",
                "season": row.get("season_key") or legacy.get("season") or "",
                "seasonKey": row.get("season_key") or legacy.get("seasonKey") or "",
                "description": _plain_text(row.get("description_html")) or legacy.get("description") or legacy.get("desc") or "",
                "descriptionHtml": row.get("description_html") or "",
                "price": _number(row.get("base_price")) or 0,
                "priceByGroup": price_groups.get(pid) or {"common": _number(row.get("base_price")) or 0},
                "colors": colors,
                "sizes": sizes,
                "images": image_urls or legacy.get("images") or [],
                "image": primary,
                "sku": row.get("sku") or "",
                "barcode": row.get("barcode") or "",
                "tags": list(row.get("tags") or []),
                "featured": bool(row.get("featured")),
                "specifications": _json_dict(row.get("specifications")),
                "visible": True,
                "active": True,
                "publish": "published",
                "variants": [
                    {
                        "id": str(v["id"]),
                        "size": v["size"],
                        "color": v["color"],
                        "colorHex": v.get("color_hex"),
                        "stock": int(v.get("stock") or 0),
                        "priceOverride": _number(v.get("price_override")),
                        "status": v.get("status") or "active",
                    }
                    for v in product_variants
                ],
                "totalStock": sum(int(v.get("stock") or 0) for v in product_variants),
            }
        )

        compare_at = _number(row.get("compare_at_price"))
        if compare_at is not None:
            item["originalPrice"] = compare_at
        else:
            item.pop("originalPrice", None)

        grouped_sizes = size_groups.get(pid, {})
        item["specialSizes"] = grouped_sizes.get("special", [])
        item["specialSizes2"] = grouped_sizes.get("special2", [])

        if colors and primary:
            current_map = item.get("imageMap") if isinstance(item.get("imageMap"), dict) else {}
            item["imageMap"] = {color["name"]: current_map.get(color["name"], primary) for color in colors}

        catalog.append(item)

    return catalog


def sync_public_catalog(connection, *, force: bool = False) -> bool:
    """Mantiene el JSON de compatibilidad del sitio publico sincronizado con PostgreSQL.

    Solo se activa cuando ROMIX_CATALOG_SOURCE apunta explicitamente a la base de datos.
    Esto conserva un rollback seguro al catalogo historico con ROMIX_CATALOG_SOURCE=json.
    """

    global _last_marker
    settings = get_settings()
    if settings.catalog_source not in _DATABASE_SOURCES:
        return False

    with _sync_lock:
        marker = _marker(connection)
        if not force and marker == _last_marker:
            return False

        catalog = _build_catalog(connection)
        allow_empty = os.getenv("ROMIX_ALLOW_EMPTY_CATALOG", "").strip().lower() in {"1", "true", "yes", "on"}
        if not catalog and marker[0] and not allow_empty:
            # Si existen productos pero ninguno esta publicado, respetamos el estado publicado: catalogo vacio.
            pass
        elif not catalog and not marker[0] and not allow_empty:
            # Evita vaciar accidentalmente la tienda si la migracion aun no se ejecuto.
            return False

        CATALOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        temporary = CATALOG_FILE.with_name(f".{CATALOG_FILE.name}.tmp")
        temporary.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, CATALOG_FILE)
        _last_marker = marker
        return True
