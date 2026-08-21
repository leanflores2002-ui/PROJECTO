from __future__ import annotations

import json
import os
import re
import unicodedata
from html import escape as html_escape
from pathlib import Path
from threading import RLock
import threading
from contextlib import asynccontextmanager
from typing import Dict, List, Tuple
from urllib.parse import urljoin

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .admin_api import router as admin_router
from .config import get_settings
from .database import close_database_pool, database_health, open_database_pool
from .public_api import router as public_router


def repo_root() -> Path:
    # backend/app/main.py -> backend/app -> backend -> repo
    return Path(__file__).resolve().parents[2]


ROOT = repo_root()
PUBLIC_DIR = ROOT / "frontend" / "public"
DATA_FILE = Path(
    os.environ.get(
        "ROMIX_PRODUCTS_FILE",
        PUBLIC_DIR / "assets" / "data" / "products.json",
    )
)
VARIANTS_FILE = ROOT / "backend" / "data" / "product_variants.json"
templates = Jinja2Templates(directory=str(PUBLIC_DIR))

# Cache en memoria para evitar leer/parsing del JSON en cada request bajo carga
_products_cache: list[dict] | None = None
_products_mtime: float | None = None
_products_json_cache: str | None = None
_products_lock = RLock()
BLOCKED_SEASON_KEYS = {"verano"}

# Variantes en memoria
_variants: Dict[Tuple[str, str, str], dict] = {}
_variants_lock = threading.RLock()


def slugify(text: str) -> str:
    if not text:
        return ""
    try:
        text = unicodedata.normalize("NFKD", text)
        text = "".join([c for c in text if not unicodedata.combining(c)])
    except Exception:
        pass
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def load_products() -> list[dict]:
    """Carga el listado de productos, reutilizando cache si el archivo no cambia."""
    global _products_cache, _products_mtime, _products_json_cache

    with _products_lock:
        if not DATA_FILE.exists():
            _products_cache = []
            _products_mtime = None
            _products_json_cache = "[]"
            return _products_cache

        mtime = DATA_FILE.stat().st_mtime
        if (
            _products_cache is not None
            and _products_mtime == mtime
            and _products_json_cache is not None
        ):
            return _products_cache

        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f) or []

        _products_cache = [p for p in data if is_public_product(p)]
        _products_mtime = mtime
        _products_json_cache = json.dumps(_products_cache, ensure_ascii=False)
        return _products_cache


def products_json() -> str:
    """Devuelve la version en JSON pre-renderizada para inyectar en templates."""
    global _products_json_cache
    load_products()
    with _products_lock:
        if _products_json_cache is None:
            _products_json_cache = json.dumps(_products_cache or [], ensure_ascii=False)
        return _products_json_cache


def normalize_text(value: str) -> str:
    if value is None:
        return ""
    txt = str(value).strip()
    if not txt:
        return ""
    try:
        txt = unicodedata.normalize("NFD", txt)
        txt = "".join([c for c in txt if not unicodedata.combining(c)])
    except Exception:
        pass
    return txt.lower()


def season_key(product: dict) -> str:
    if not isinstance(product, dict):
        return ""
    season = normalize_text(product.get("season", ""))
    compact = re.sub(r"[^a-z0-9]+", "", season)
    if not compact:
        return ""
    if "verano" in compact:
        return "verano"
    if "invierno" in compact:
        return "invierno"
    if compact == "mediaestacion":
        return "media-estacion"
    return ""


def is_public_product(product: dict) -> bool:
    return season_key(product) not in BLOCKED_SEASON_KEYS


def variants_file() -> Path:
    VARIANTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    return VARIANTS_FILE


def build_variants_from_products(products: list[dict]) -> list[dict]:
    variants: list[dict] = []
    for p in products:
        pid = p.get("id") or slugify(p.get("name", ""))
        colors = p.get("colors") or []
        sizes = p.get("sizes") or []
        if not colors:
            colors = [{"name": "Unico"}]
        if not sizes:
            sizes = [{"size": "U", "status": "available"}]
        for color in colors:
            color_name = color["name"] if isinstance(color, dict) else str(color)
            for size in sizes:
                size_name = size.get("size") if isinstance(size, dict) else str(size)
                status = str(size.get("status", "")).lower() if isinstance(size, dict) else ""
                if "out" in status or "unavail" in status:
                    stock = 0
                elif "low" in status:
                    stock = 2
                else:
                    stock = 5
                variants.append(
                    {
                        "id": f"{pid}-{slugify(color_name)}-{slugify(size_name)}",
                        "product_id": pid,
                        "color": color_name,
                        "size": size_name,
                        "stock": stock,
                    }
                )
    return variants


def load_variants(force: bool = False) -> dict:
    global _variants
    with _variants_lock:
        if _variants and not force:
            return _variants
        path = variants_file()
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8") or "[]")
        else:
            data = build_variants_from_products(load_products())
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        _variants = {}
        for v in data:
            key = (
                str(v.get("product_id") or "").strip(),
                normalize_text(v.get("color", "")),
                normalize_text(v.get("size", "")),
            )
            if not key[0]:
                continue
            _variants[key] = {
                "product_id": v.get("product_id"),
                "color": v.get("color"),
                "size": v.get("size"),
                "stock": int(v.get("stock") or 0),
                "id": v.get("id") or "-".join(key),
            }
        return _variants


def persist_variants() -> None:
    path = variants_file()
    payload = list(_variants.values())
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def get_variant(product_id: str, color: str, size: str) -> dict | None:
    key = (str(product_id).strip(), normalize_text(color), normalize_text(size))
    return load_variants().get(key)


def absolute_url(request: Request, value: str) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    return urljoin(str(request.base_url), raw.lstrip("/"))


def product_share_description(product: dict) -> str:
    if not isinstance(product, dict):
        return "Descubri calzas, joggers y outfits deportivos con estilo."

    for key in ("description", "desc", "subtitle"):
        value = str(product.get(key) or "").strip()
        if value:
            compact = re.sub(r"\s+", " ", value)
            return compact[:220]

    type_label = str(product.get("type") or "").strip()
    section = str(product.get("section") or "").strip()
    fallback = "Descubri calzas, joggers y outfits deportivos con estilo."
    if type_label and section:
        return f"{type_label} para {section}. {fallback}"
    if type_label:
        return f"{type_label}. {fallback}"
    return fallback


def product_share_image(request: Request, product: dict) -> str:
    image = str(product.get("image") or "").strip()

    if not image and isinstance(product.get("images"), dict):
        image = next(
            (str(src).strip() for src in product["images"].values() if str(src or "").strip()),
            "",
        )

    if not image:
        image = "images/logo-romix-social-1200x630.png"

    return absolute_url(request, image)


def inject_product_meta(
    html_text: str,
    *,
    title: str,
    description: str,
    image_url: str,
    page_url: str,
) -> str:
    safe_title = html_escape(title, quote=True)
    safe_description = html_escape(description, quote=True)
    safe_image = html_escape(image_url, quote=True)
    safe_url = html_escape(page_url, quote=True)

    replacements = {
        '<meta property="og:title" content="ROMIX - Indumentaria Deportiva & Urbana">':
        f'<meta property="og:title" content="{safe_title}">',
        '<meta property="og:description" content="Descubri calzas, joggers y outfits deportivos con estilo. Movimiento y estilo para cada dia.">':
        f'<meta property="og:description" content="{safe_description}">',
        '<meta property="og:image" content="https://romi-damas.netlify.app/images/logo-romix-social-1200x630.png">':
        f'<meta property="og:image" content="{safe_image}">',
        '<meta property="og:url" content="https://romi-damas.netlify.app/">':
        f'<meta property="og:url" content="{safe_url}">',
        '<meta name="twitter:title" content="ROMIX - Indumentaria Deportiva & Urbana">':
        f'<meta name="twitter:title" content="{safe_title}">',
        '<meta name="twitter:description" content="Descubri calzas, joggers y outfits deportivos con estilo. Movimiento y estilo para cada dia.">':
        f'<meta name="twitter:description" content="{safe_description}">',
        '<meta name="twitter:image" content="https://romi-damas.netlify.app/images/logo-romix-social-1200x630.png">':
        f'<meta name="twitter:image" content="{safe_image}">',
    }

    rendered = html_text
    for old, new in replacements.items():
        rendered = rendered.replace(old, new, 1)
    return rendered


settings = get_settings()
@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_products()
    load_variants(force=True)
    open_database_pool()
    try:
        yield
    finally:
        close_database_pool()


app = FastAPI(title="ROMIX API", version="1.1.0", lifespan=lifespan)

# Los origins se controlan por entorno. En produccion se rechaza explicitamente "*".
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "environment": settings.environment, "catalogSource": settings.catalog_source}


@app.get("/api/health/ready")
def readiness():
    if not settings.database_url:
        return {"status": "degraded", "database": "not_configured", "catalog": "json"}
    if not database_health():
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ready", "database": "ok", "catalog": settings.catalog_source}


@app.get("/api/products")
def get_products(section: str | None = None):
    products = load_products()
    if section:
        section = section.strip().lower()
        products = [p for p in products if str(p.get("section", "")).lower() == section]
    return products


@app.get("/api/products/{slug}")
def get_product(slug: str):
    products = load_products()
    for p in products:
        if slugify(p.get("name", "")) == slug:
            return p
    raise HTTPException(status_code=404, detail="Producto no encontrado")


@app.get("/api/search")
def search(q: str):
    qn = (q or "").strip().lower()
    if not qn:
        return []

    def score(p: dict) -> int:
        name = str(p.get("name", "")).lower()
        type_ = str(p.get("type", "")).lower()
        s = -1
        if name.startswith(qn):
            s = 100 - len(name)
        elif qn in name:
            s = 80 - name.index(qn)
        elif qn in type_:
            s = 60 - type_.index(qn)
        return s

    products = load_products()
    items = sorted(
        [p for p in products if score(p) >= 0], key=lambda p: score(p), reverse=True
    )[:12]
    return [
        {"name": p.get("name", ""), "type": p.get("type", ""), "slug": slugify(p.get("name", ""))}
        for p in items
    ]


# Vistas HTML renderizadas con Jinja (precargan productos en el cliente)
@app.get("/", response_class=HTMLResponse)
def home(request: Request, q: str | None = None):
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "products_json": products_json(),
            "query": q or "",
        },
    )


@app.get("/catalogo", response_class=HTMLResponse)
def catalog_page(request: Request, q: str | None = None):
    return templates.TemplateResponse(
        "catalogo.html",
        {
            "request": request,
            "products_json": products_json(),
            "query": q or "",
        },
    )


@app.get("/product/{slug}", response_class=HTMLResponse)
def product_page(request: Request, slug: str):
    products = load_products()
    product = None
    for p in products:
        if slugify(p.get("name", "")) == slug:
            product = p
            break
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    title_name = str(product.get("name") or "").strip() or "Producto"
    og_title = f"{title_name} | ROMIX"
    og_description = product_share_description(product)
    og_image = product_share_image(request, product)
    og_url = absolute_url(request, f"product/{slug}")

    template = templates.get_template("product.html")
    html_content = template.render(
        request=request,
        product_json=json.dumps(product, ensure_ascii=False),
        products_json=products_json(),
        slug=slug,
    )
    html_with_meta = inject_product_meta(
        html_content,
        title=og_title,
        description=og_description,
        image_url=og_image,
        page_url=og_url,
    )

    return HTMLResponse(content=html_with_meta)


def ensure_product_exists(product_id: str) -> dict:
    products = load_products()
    for p in products:
        pid = p.get("id") or slugify(p.get("name", ""))
        if str(pid) == str(product_id):
            return p
    raise HTTPException(status_code=400, detail=f"Producto {product_id} inexistente")


def validate_and_reserve(items: List[dict]) -> Tuple[List[dict], List[dict]]:
    """Valida stock y retorna (updates, order_items) sin persistir todavía."""
    updates = []
    order_items = []
    with _variants_lock:
        variants = load_variants()
        for it in items:
            pid = str(it.get("productId") or "").strip()
            color = it.get("color") or ""
            size = it.get("size") or ""
            qty = int(it.get("qty") or 0)
            if not pid or not color or not size or qty <= 0:
                raise HTTPException(status_code=400, detail="Item invalido: productId, color, size y qty son obligatorios")
            ensure_product_exists(pid)
            key = (pid, normalize_text(color), normalize_text(size))
            variant = variants.get(key)
            if not variant:
                raise HTTPException(status_code=400, detail=f"No existe variante para productId={pid}, color={color}, talle={size}")
            if variant["stock"] < qty:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente para {variant['color']} talle {variant['size']}")
        for it in items:
            pid = str(it.get("productId"))
            color = it.get("color")
            size = it.get("size")
            qty = int(it.get("qty"))
            key = (pid, normalize_text(color), normalize_text(size))
            variant = variants[key]
            variant["stock"] -= qty
            if variant["stock"] < 0:
                variant["stock"] = 0
            updates.append(
                {
                    "productId": pid,
                    "color": variant["color"],
                    "size": variant["size"],
                    "stock": variant["stock"],
                }
            )
            order_items.append({"productId": pid, "color": variant["color"], "size": variant["size"], "qty": qty})
        persist_variants()
    return updates, order_items


@app.get("/api/variants")
def list_variants():
    return list(load_variants().values())


@app.post("/api/orders")
def create_order(body: dict):
    items = body.get("items") if isinstance(body, dict) else None
    if not items or not isinstance(items, list):
        raise HTTPException(status_code=400, detail="items es requerido")
    updates, order_items = validate_and_reserve(items)
    order_id = os.urandom(8).hex()
    return {"orderId": order_id, "updatedVariants": updates, "items": order_items}


# Rutas nuevas, mantenidas en paralelo durante la migracion para no romper consumidores actuales.
app.include_router(public_router)
app.include_router(admin_router)


# Servir estaticos desde el frontend publico
app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="static")
