from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any
from uuid import NAMESPACE_URL, UUID, uuid5


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = ROOT / "frontend" / "public" / "assets" / "data" / "products.json"
PUBLIC_DIR = ROOT / "frontend" / "public"


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    ascii_value = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")


def stable_uuid(kind: str, key: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"https://romixropas.com/migration/{kind}/{key}")


def source_hash(value: dict) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def normalize_audience(value: str) -> str:
    key = slugify(value).replace("-", "")
    return {"mujer": "mujer", "hombre": "hombre", "ninos": "ninos", "nino": "ninos"}.get(key, key)


def load_products(path: Path) -> list[dict]:
    raw = path.read_text(encoding="utf-8-sig")
    parsed = json.loads(raw)
    if not isinstance(parsed, list):
        raise ValueError("products.json debe contener un array")
    return parsed


def image_paths(product: dict) -> list[str]:
    paths: list[str] = []
    direct = product.get("image")
    if direct:
        paths.append(str(direct))
    images = product.get("images")
    if isinstance(images, list):
        paths.extend(str(value) for value in images if value)
    elif isinstance(images, dict):
        paths.extend(str(value) for value in images.values() if value)
    return list(dict.fromkeys(paths))


def validate(products: list[dict]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    names: list[str] = []
    slugs: list[str] = []
    referenced_images: set[str] = set()
    variant_count = 0
    price_group_count = 0

    for index, product in enumerate(products):
        label = f"producto[{index}]"
        if not isinstance(product, dict):
            errors.append(f"{label}: no es un objeto")
            continue
        name = str(product.get("name") or "").strip()
        if not name:
            errors.append(f"{label}: falta name")
            continue
        names.append(name)
        slugs.append(slugify(name))
        audience = normalize_audience(product.get("section", ""))
        if audience not in {"mujer", "hombre", "ninos"}:
            errors.append(f"{name}: section invalida ({product.get('section')!r})")
        if not str(product.get("type") or "").strip():
            errors.append(f"{name}: falta type/categoria")
        try:
            if float(product.get("price")) < 0:
                errors.append(f"{name}: price negativo")
        except (TypeError, ValueError):
            errors.append(f"{name}: price invalido")
        colors = product.get("colors")
        sizes = product.get("sizes")
        if not isinstance(colors, list) or not colors:
            errors.append(f"{name}: colors vacio o invalido")
        if not isinstance(sizes, list) or not sizes:
            errors.append(f"{name}: sizes vacio o invalido")
        if isinstance(colors, list) and isinstance(sizes, list):
            variant_count += len(colors) * len(sizes)
        groups = product.get("priceByGroup")
        if groups is None:
            warnings.append(f"{name}: sin priceByGroup; se usara price como common")
        elif not isinstance(groups, dict):
            errors.append(f"{name}: priceByGroup no es objeto")
        else:
            for key, amount in groups.items():
                if key not in {"common", "special", "special2"}:
                    warnings.append(f"{name}: grupo de precio no reconocido {key!r}")
                if amount is not None and (not isinstance(amount, (int, float)) or amount < 0):
                    errors.append(f"{name}: importe invalido en priceByGroup.{key}")
                if amount is not None:
                    price_group_count += 1
        if product.get("superSpecialSizes"):
            warnings.append(f"{name}: superSpecialSizes existe pero el frontend actual no lo consume")
        for image in image_paths(product):
            referenced_images.add(image)
            if not re.match(r"^https?://", image) and not (PUBLIC_DIR / image.lstrip("/")).is_file():
                errors.append(f"{name}: imagen inexistente {image}")

    duplicate_names = [value for value, count in Counter(names).items() if count > 1]
    duplicate_slugs = [value for value, count in Counter(slugs).items() if count > 1]
    if duplicate_names:
        errors.append(f"Nombres duplicados: {duplicate_names}")
    if duplicate_slugs:
        errors.append(f"Slugs duplicados: {duplicate_slugs}")

    return {
        "valid": not errors,
        "products": len(products),
        "categories": len({(normalize_audience(p.get('section', '')), slugify(p.get('type', ''))) for p in products}),
        "variants": variant_count,
        "priceGroups": price_group_count,
        "uniqueImages": len(referenced_images),
        "seasons": dict(Counter(str(p.get("season") or "") for p in products)),
        "audiences": dict(Counter(normalize_audience(p.get("section", "")) for p in products)),
        "errors": errors,
        "warnings": warnings,
    }


def size_value(entry: Any) -> str:
    return str(entry.get("size") if isinstance(entry, dict) else entry).strip()


def size_stock(entry: Any) -> int:
    status = str(entry.get("status") if isinstance(entry, dict) else "available").lower()
    if "out" in status or "unavail" in status:
        return 0
    if "low" in status:
        return 2
    return 5


def color_value(entry: Any) -> tuple[str, str | None]:
    if isinstance(entry, dict):
        return str(entry.get("name") or "Unico").strip(), entry.get("hex")
    return str(entry or "Unico").strip(), None


def import_to_database(products: list[dict], database_url: str) -> dict[str, int]:
    try:
        import psycopg
        from psycopg.rows import dict_row
        from psycopg.types.json import Jsonb
    except ImportError as exc:
        raise RuntimeError("Instala backend/requirements.txt antes de usar --apply") from exc

    totals = {"products": 0, "categories": 0, "images": 0, "variants": 0, "priceGroups": 0}
    with psycopg.connect(database_url, row_factory=dict_row) as connection, connection.transaction():
        current = connection.execute("select count(*) as count from public.products").fetchone()["count"]
        if current:
            raise RuntimeError(f"La tabla products ya contiene {current} registros; se cancela para evitar sobrescrituras")

        categories: dict[tuple[str, str], UUID] = {}
        for product in products:
            audience = normalize_audience(product["section"])
            category_slug = slugify(product["type"])
            key = (audience, category_slug)
            if key in categories:
                continue
            category_id = stable_uuid("category", f"{audience}/{category_slug}")
            connection.execute(
                """
                insert into public.categories (id, name, slug, audience, status)
                values (%s, %s, %s, %s, 'active')
                """,
                (category_id, str(product["type"]).strip().title(), category_slug, audience),
            )
            categories[key] = category_id
            totals["categories"] += 1

        for product in products:
            name = str(product["name"]).strip()
            slug = slugify(name)
            product_id = stable_uuid("product", slug)
            audience = normalize_audience(product["section"])
            category_id = categories[(audience, slugify(product["type"]))]
            season = str(product.get("season") or "").strip()
            status = "hidden" if slugify(season) == "verano" else "published"
            base_price = product["price"]
            sku = f"ROMIX-{source_hash(product)[:12].upper()}"
            tags = [str(product["type"]).strip().lower(), season]
            connection.execute(
                """
                insert into public.products
                    (id, legacy_id, name, slug, sku, audience, category_id, season_key, status,
                     base_price, compare_at_price, tags, featured, legacy_payload, source_hash)
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    product_id, slug, name, slug, sku, audience, category_id, season, status,
                    base_price, product.get("originalPrice"), tags, bool(product.get("featured")),
                    Jsonb(product), source_hash(product),
                ),
            )
            totals["products"] += 1

            groups = dict(product.get("priceByGroup") or {})
            groups.setdefault("common", base_price)
            for group, amount in groups.items():
                if group not in {"common", "special", "special2"} or amount is None:
                    continue
                connection.execute(
                    "insert into public.product_price_groups (product_id, price_group, amount) values (%s, %s, %s)",
                    (product_id, group, amount),
                )
                totals["priceGroups"] += 1
            for field, group in (("specialSizes", "special"), ("specialSizes2", "special2")):
                if group not in groups or groups[group] is None:
                    continue
                for size in product.get(field) or []:
                    connection.execute(
                        """
                        insert into public.product_size_price_groups (product_id, size, price_group)
                        values (%s, %s, %s) on conflict (product_id, size) do update set price_group = excluded.price_group
                        """,
                        (product_id, str(size), group),
                    )

            primary_path = str(product.get("image") or "")
            for position, path in enumerate(image_paths(product)):
                connection.execute(
                    """
                    insert into public.product_images
                        (product_id, source, storage_path, public_url, alt_text, position, is_primary)
                    values (%s, 'legacy', null, %s, %s, %s, %s)
                    """,
                    (product_id, path, name, position, path == primary_path),
                )
                totals["images"] += 1

            for color_entry in product["colors"]:
                color, color_hex = color_value(color_entry)
                for size_entry in product["sizes"]:
                    size = size_value(size_entry)
                    stock = size_stock(size_entry)
                    variant_id = stable_uuid("variant", f"{slug}/{slugify(color)}/{slugify(size)}")
                    connection.execute(
                        """
                        insert into public.product_variants
                            (id, product_id, size, color, color_hex, stock, status)
                        values (%s, %s, %s, %s, %s, %s, 'active')
                        """,
                        (variant_id, product_id, size, color, color_hex, stock),
                    )
                    if stock:
                        connection.execute(
                            """
                            insert into public.stock_movements
                                (variant_id, movement_type, quantity_delta, stock_before, stock_after, reason)
                            values (%s, 'incoming', %s, 0, %s, 'Importacion inicial desde estado de products.json')
                            """,
                            (variant_id, stock, stock),
                        )
                    totals["variants"] += 1

        database_counts = connection.execute(
            """
            select
              (select count(*) from public.products) as products,
              (select count(*) from public.categories) as categories,
              (select count(*) from public.product_images) as images,
              (select count(*) from public.product_variants) as variants,
              (select count(*) from public.product_price_groups) as price_groups
            """
        ).fetchone()
        expected = {**totals, "price_groups": totals["priceGroups"]}
        for key in ("products", "categories", "images", "variants", "price_groups"):
            if database_counts[key] != expected[key]:
                raise RuntimeError(f"Verificacion fallida para {key}: {database_counts[key]} != {expected[key]}")
    return totals


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida e importa el catalogo JSON de ROMIX a PostgreSQL")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--expect-products", type=int, default=157)
    parser.add_argument("--apply", action="store_true", help="Importar tras validar; por defecto solo valida")
    parser.add_argument("--database-url", help="URL PostgreSQL; tambien acepta DATABASE_URL del entorno")
    args = parser.parse_args()

    products = load_products(args.source.resolve())
    report = validate(products)
    if len(products) != args.expect_products:
        report["valid"] = False
        report["errors"].append(f"Cantidad inesperada: {len(products)} != {args.expect_products}")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not report["valid"]:
        return 1
    if not args.apply:
        return 0

    import os

    database_url = args.database_url or os.getenv("DATABASE_URL")
    if not database_url:
        print("Falta --database-url o DATABASE_URL", file=sys.stderr)
        return 2
    totals = import_to_database(products, database_url)
    print(json.dumps({"imported": totals}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
