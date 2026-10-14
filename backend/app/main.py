from __future__ import annotations

import json
import os
import re
import unicodedata
from html import escape as html_escape
from pathlib import Path
from threading import RLock
import threading
import tempfile
from typing import Dict, List, Tuple
from urllib.parse import quote, urljoin

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from markupsafe import Markup
from .admin_api import router as admin_router
from .public_api import router as public_router, create_public_order, PublicOrder
from .admin_management import router as management_router
from .database import database_connection, open_database_pool, close_database_pool
from .catalog_sync import _build_catalog
from .inventory_service import InventoryService
from .product_schemas import ProductDetail
from .config import get_settings


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
SITE_URL = str(os.environ.get("ROMIX_SITE_URL") or json.loads(
    (ROOT / "config" / "site.json").read_text())["origin"]).strip().rstrip("/")

# Cache en memoria para evitar leer/parsing del JSON en cada request bajo carga
_products_cache: list[dict] | None = None
_products_mtime: float | None = None
_products_json_cache: str | None = None
_products_lock = RLock()

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
    if os.getenv("DATABASE_URL"):
        with database_connection() as connection:
            return _build_catalog(connection)
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
    if os.getenv('DATABASE_URL'):
        try:
            return script_json(load_products())
        except HTTPException:
            return script_json([])
    load_products()
    with _products_lock:
        if _products_json_cache is None:
            _products_json_cache = json.dumps(_products_cache or [], ensure_ascii=False)
        return safe_script_json(_products_json_cache)


def script_json(value) -> Markup:
    """JSON for script data, never executable markup or HTML entities."""
    return safe_script_json(json.dumps(value, ensure_ascii=False))


def safe_script_json(raw: str) -> Markup:
    return Markup(raw.replace("<", "\\u003c")
                  .replace(">", "\\u003e").replace("&", "\\u0026")
                  .replace("\u2028", "\\u2028").replace("\u2029", "\\u2029"))


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
    """La temporada describe al producto; `visible` decide si se publica."""
    if not isinstance(product, dict):
        return False
    return product.get("visible", True) is not False


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


def persist_variants(payload: list[dict] | None = None) -> None:
    path = variants_file()
    payload = list(_variants.values()) if payload is None else payload
    # Replace a complete snapshot on the same filesystem; never leave truncated JSON.
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         prefix=".variants-", suffix=".tmp", delete=False) as file:
            temporary = Path(file.name)
            json.dump(payload, file, ensure_ascii=False, indent=2)
            file.flush()
            os.fsync(file.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def get_variant(product_id: str, color: str, size: str) -> dict | None:
    key = (str(product_id).strip(), normalize_text(color), normalize_text(size))
    return load_variants().get(key)


def absolute_url(request: Request, value: str) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    if raw.startswith("http://") or raw.startswith("https://"):
        return quote(raw, safe=":/?&=#%")
    base_url = SITE_URL or str(request.base_url).rstrip("/")
    return quote(urljoin(f"{base_url}/", raw.lstrip("/")), safe=":/?&=#%")


def upsert_meta_tag(html_text: str, attr_name: str, attr_value: str, content: str) -> str:
    pattern = re.compile(
        rf'<meta\s+[^>]*{attr_name}="{re.escape(attr_value)}"[^>]*content="[^"]*"[^>]*>',
        re.IGNORECASE,
    )
    replacement = f'<meta {attr_name}="{attr_value}" content="{content}">'
    if pattern.search(html_text):
        return pattern.sub(replacement, html_text, count=1)
    insert_at = html_text.find("</head>")
    if insert_at == -1:
        return html_text
    return f'{html_text[:insert_at]}  {replacement}\n{html_text[insert_at:]}'


def upsert_canonical_link(html_text: str, href: str) -> str:
    pattern = re.compile(r'<link\s+rel="canonical"\s+href="[^"]*"\s*/?>', re.IGNORECASE)
    replacement = f'<link rel="canonical" href="{href}" />'
    if pattern.search(html_text):
        return pattern.sub(replacement, html_text, count=1)
    insert_at = html_text.find("</head>")
    if insert_at == -1:
        return html_text
    return f'{html_text[:insert_at]}  {replacement}\n{html_text[insert_at:]}'


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

    images = product.get("images")
    if not image and isinstance(images, dict):
        image = next((str(src).strip() for src in images.values() if str(src or "").strip()), "")
    if not image and isinstance(images, list):
        image = next((str(src).strip() for src in images if str(src or "").strip()), "")

    if not image:
        image = "images/branding/romix-logo-social.webp"

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
    rendered = html_text
    rendered = re.sub(r"<title>.*?</title>", lambda _: f"<title>{safe_title}</title>", rendered, count=1, flags=re.DOTALL)
    rendered = upsert_meta_tag(rendered, "name", "description", safe_description)
    rendered = upsert_meta_tag(rendered, "property", "og:type", "product")
    rendered = upsert_meta_tag(rendered, "property", "og:site_name", "ROMIX")
    rendered = upsert_meta_tag(rendered, "property", "og:title", safe_title)
    rendered = upsert_meta_tag(rendered, "property", "og:description", safe_description)
    rendered = upsert_meta_tag(rendered, "property", "og:image", safe_image)
    rendered = upsert_meta_tag(rendered, "property", "og:image:secure_url", safe_image)
    rendered = upsert_meta_tag(rendered, "property", "og:image:alt", safe_title)
    rendered = upsert_meta_tag(rendered, "property", "og:url", safe_url)
    rendered = upsert_meta_tag(rendered, "name", "twitter:card", "summary_large_image")
    rendered = upsert_meta_tag(rendered, "name", "twitter:title", safe_title)
    rendered = upsert_meta_tag(rendered, "name", "twitter:description", safe_description)
    rendered = upsert_meta_tag(rendered, "name", "twitter:image", safe_image)
    rendered = upsert_meta_tag(rendered, "name", "twitter:url", safe_url)
    rendered = upsert_canonical_link(rendered, safe_url)
    return rendered


app = FastAPI(title="ROMIX API", version="1.0.0")


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store'
    preview = any(os.environ.get(key) and os.environ[key] != "production"
                  for key in ("VERCEL_ENV", "CONTEXT"))
    if preview or response.status_code >= 400 or request.url.path.startswith(("/api/", "/docs", "/redoc", "/openapi.json")):
        response.headers["X-Robots-Tag"] = "noindex, follow"
    return response

# Permitir consumir desde el mismo host y uso local
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(get_settings().cors_origins + [origin.strip() for origin in os.environ.get(
        "ROMIX_CORS_ORIGINS", SITE_URL or json.loads((ROOT / "config" / "site.json").read_text())["origin"]
    ).split(",") if origin.strip()])),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.on_event("startup")
def warm_products_cache():
    # Precalentamos cache para evitar latencia en las primeras peticiones
    if os.getenv("DATABASE_URL"):
        open_database_pool()
    else:
        load_products()
        load_variants(force=True)


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
        request=request,
        name="index.html",
        context={
            "request": request,
            "products_json": products_json(),
            "query": q or "",
        },
    )


@app.get("/catalogo", response_class=HTMLResponse)
def catalog_page(request: Request, q: str | None = None):
    return templates.TemplateResponse(
        request=request,
        name="catalogo.html",
        context={
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
    canonical_slug = slugify(product.get("name") or product.get("id") or "producto")
    id_slug = slugify(str(product.get("id") or ""))
    if id_slug and id_slug != canonical_slug and not canonical_slug.endswith(f"-{id_slug}"):
        canonical_slug = f"{canonical_slug}-{id_slug}"
    product_id = quote(str(product.get("id") or canonical_slug), safe="")
    product_name = quote(title_name, safe="-_.!~*'()")
    og_url = absolute_url(request, f"product.html?id={product_id}&slug={canonical_slug}&name={product_name}")

    template = templates.get_template("product.html")
    html_content = template.render(
        request=request,
        product_json=script_json(product),
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
    """Validate the entire order and commit one stock snapshot under the process lock."""
    global _variants
    updates = []
    order_items = []
    with _variants_lock:
        variants = load_variants()
        quantities = {}
        for it in items:
            if not isinstance(it, dict):
                raise HTTPException(status_code=400, detail="Item invalido")
            pid = str(it.get("productId") or "").strip()
            color = it.get("color") or ""
            size = it.get("size") or ""
            qty = it.get("qty")
            if type(qty) is not int or qty <= 0:
                raise HTTPException(status_code=400, detail="qty debe ser un entero positivo")
            if not pid or not isinstance(color, str) or not color.strip() or not isinstance(size, str) or not size.strip():
                raise HTTPException(status_code=400, detail="Item invalido: productId, color, size y qty son obligatorios")
            ensure_product_exists(pid)
            key = (pid, normalize_text(color), normalize_text(size))
            variant = variants.get(key)
            if not variant:
                raise HTTPException(status_code=400, detail=f"No existe variante para productId={pid}, color={color}, talle={size}")
            quantities[key] = quantities.get(key, 0) + qty
        for key, qty in quantities.items():
            variant = variants[key]
            if variant["stock"] < qty:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente para {variant['color']} talle {variant['size']}")
        next_variants = {key: dict(variant) for key, variant in variants.items()}
        for key, qty in quantities.items():
            pid = key[0]
            variant = next_variants[key]
            variant["stock"] -= qty
            updates.append(
                {
                    "productId": pid,
                    "color": variant["color"],
                    "size": variant["size"],
                    "stock": variant["stock"],
                }
            )
            order_items.append({"productId": pid, "color": variant["color"], "size": variant["size"], "qty": qty})
        persist_variants(list(next_variants.values()))
        _variants = next_variants
    return updates, order_items


@app.get("/api/variants")
def list_variants():
    if os.getenv("DATABASE_URL"):
        with database_connection() as connection:
            return InventoryService.list_stock(connection)
    public_ids = {
        str(product.get("id") or slugify(product.get("name", "")))
        for product in load_products()
    }
    return [
        variant
        for variant in load_variants().values()
        if str(variant.get("product_id") or "") in public_ids
    ]


@app.post("/api/orders")
def create_order(body: dict):
    if os.getenv("DATABASE_URL"):
        try:
            payload = PublicOrder.model_validate(body)
        except Exception:
            raise HTTPException(422, "Pedido inválido: falta request_key o variantes válidas")
        return create_public_order(payload)
    items = body.get("items") if isinstance(body, dict) else None
    if not items or not isinstance(items, list):
        raise HTTPException(status_code=400, detail="items es requerido")
    updates, order_items = validate_and_reserve(items)
    order_id = os.urandom(8).hex()
    return {"orderId": order_id, "updatedVariants": updates, "items": order_items}


app.include_router(admin_router)
app.include_router(public_router)
app.include_router(management_router)

@app.on_event("shutdown")
def stop_pool():
    close_database_pool()

ADMIN_DIR = ROOT / "frontend" / "admin" / "dist"
if ADMIN_DIR.exists():
    @app.get('/admin/activate', include_in_schema=False)
    def activate_admin():
        return FileResponse(ADMIN_DIR / 'index.html')
    app.mount("/admin", StaticFiles(directory=str(ADMIN_DIR), html=True), name="admin")

# Servir estaticos desde el frontend publico
app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="static")
