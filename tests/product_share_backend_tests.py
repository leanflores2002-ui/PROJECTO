from __future__ import annotations

import re
import sys
from html import unescape
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from starlette.requests import Request

from backend.app import main


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def request_for(path: str) -> Request:
    return Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "GET",
            "scheme": "https",
            "path": path,
            "raw_path": path.encode("utf-8"),
            "query_string": b"",
            "headers": [(b"host", b"romix.example")],
            "client": ("testclient", 50000),
            "server": ("romix.example", 443),
            "root_path": "",
            "app": main.app,
        }
    )


def meta(html_text: str, attribute: str, key: str) -> str:
    pattern = rf'<meta\s+[^>]*{attribute}="{re.escape(key)}"[^>]*content="([^"]*)"[^>]*>'
    match = re.search(pattern, html_text, re.IGNORECASE)
    return unescape(match.group(1)) if match else ""


def canonical(html_text: str) -> str:
    match = re.search(r'<link\s+rel="canonical"\s+href="([^"]+)"', html_text, re.IGNORECASE)
    return unescape(match.group(1)) if match else ""


def run() -> None:
    original_site_url = main.SITE_URL
    main.SITE_URL = ""
    try:
        products = main.load_products()
        for section in ("mujer", "hombre", "ninos"):
            product = next((item for item in products if item.get("section") == section), None)
            assert_true(product is not None, f"Falta producto visible para {section}")
            slug = main.slugify(product.get("name", ""))
            response = main.product_page(request_for(f"/product/{slug}"), slug)
            html_text = bytes(response.body).decode("utf-8")
            encoded_name = quote(product["name"], safe="-_.!~*'()")
            expected_url = f"https://romix.example/productos/{slug}/"

            assert_true(response.status_code == 200, f"{section}: status incorrecto")
            assert_true(meta(html_text, "property", "og:type") == "product", f"{section}: og:type")
            assert_true(meta(html_text, "property", "og:site_name") == "ROMIX", f"{section}: og:site_name")
            assert_true(meta(html_text, "property", "og:title") == f"{product['name']} | ROMIX", f"{section}: og:title")
            assert_true(meta(html_text, "property", "og:description") == main.product_share_description(product), f"{section}: og:description")
            assert_true(meta(html_text, "property", "og:image").startswith("https://romix.example/"), f"{section}: og:image absoluta")
            assert_true(meta(html_text, "property", "og:url") == expected_url, f"{section}: og:url")
            assert_true(meta(html_text, "name", "twitter:card") == "summary_large_image", f"{section}: twitter:card")
            assert_true(meta(html_text, "name", "twitter:image") == meta(html_text, "property", "og:image"), f"{section}: twitter:image")
            assert_true(canonical(html_text) == expected_url, f"{section}: canonical")

        list_image = main.product_share_image(
            request_for("/product/lista"),
            {"images": ["images/products/foto con espacio.png"]},
        )
        assert_true(list_image == "https://romix.example/images/products/foto%20con%20espacio.png", "images[0] debe generar URL absoluta codificada")

        missing_slug = "producto-que-no-existe"
        try:
            main.product_page(request_for(f"/product/{missing_slug}"), missing_slug)
        except main.HTTPException as error:
            assert_true(error.status_code == 404, "Producto inexistente debe responder 404")
        else:
            raise AssertionError("Producto inexistente no respondio 404")
    finally:
        main.SITE_URL = original_site_url


if __name__ == "__main__":
    run()
    print("product_share_backend_tests: passed")
