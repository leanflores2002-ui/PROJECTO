from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import HTTPException
from starlette.requests import Request

from backend.app import main


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


PRODUCTS = [
    {
        "id": "verano-visible",
        "name": "Remera Verano Visible",
        "section": "mujer",
        "type": "remeras",
        "season": "verano",
        "visible": True,
        "price": 10000,
        "image": "images/logo-romix.png",
        "colors": [{"name": "Negro"}],
        "sizes": ["2"],
    },
    {
        "id": "verano-oculto",
        "name": "Remera Verano Oculto",
        "section": "mujer",
        "type": "remeras",
        "season": "verano",
        "visible": False,
        "price": 10000,
        "image": "images/logo-romix.png",
        "colors": [{"name": "Negro"}],
        "sizes": ["2"],
    },
    {
        "id": "invierno-legacy",
        "name": "Campera Invierno Legacy",
        "section": "hombre",
        "type": "camperas",
        "season": "invierno",
        "price": 20000,
        "image": "images/logo-romix.png",
        "colors": [{"name": "Negro"}],
        "sizes": ["3"],
    },
    {
        "id": "media-legacy",
        "name": "Pantalon Media Estacion Legacy",
        "section": "mujer",
        "type": "pantalones",
        "season": "media-estacion",
        "hidden": True,
        "active": False,
        "state": "draft",
        "price": 15000,
        "image": "images/logo-romix.png",
        "colors": [{"name": "Negro"}],
        "sizes": ["2"],
    },
]


def request_for(path: str) -> Request:
    return Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": path,
            "raw_path": path.encode("utf-8"),
            "query_string": b"",
            "headers": [],
            "client": ("testclient", 50000),
            "server": ("localhost", 80),
            "root_path": "",
            "app": main.app,
        }
    )


def expect_http_error(status_code: int, callback, message: str) -> None:
    try:
        callback()
    except HTTPException as error:
        assert_true(error.status_code == status_code, message)
        return
    raise AssertionError(message)


def run() -> None:
    original_data_file = main.DATA_FILE
    original_cache = main._products_cache
    original_mtime = main._products_mtime
    original_json_cache = main._products_json_cache
    original_variants = main._variants

    with tempfile.TemporaryDirectory() as temp_dir:
        products_file = Path(temp_dir) / "products.json"
        products_file.write_text(json.dumps(PRODUCTS, ensure_ascii=False), encoding="utf-8")

        try:
            main.DATA_FILE = products_file
            main._products_cache = None
            main._products_mtime = None
            main._products_json_cache = None

            loaded = main.load_products()
            loaded_ids = {product["id"] for product in loaded}
            assert_true("verano-visible" in loaded_ids, "API debe publicar verano visible")
            assert_true("verano-oculto" not in loaded_ids, "API debe ocultar visible false")
            assert_true("invierno-legacy" in loaded_ids, "API debe publicar productos sin visible")
            assert_true("media-legacy" in loaded_ids, "Flags legacy no deben controlar publicacion")

            api_products = main.get_products()
            assert_true(api_products == loaded, "Listado API debe usar la lista publica")
            assert_true(main.get_product("remera-verano-visible")["id"] == "verano-visible",
                        "API individual debe devolver verano visible")
            expect_http_error(
                404,
                lambda: main.get_product("remera-verano-oculto"),
                "API individual debe responder 404 para visible false",
            )

            search_names = {item["name"] for item in main.search("Verano")}
            assert_true("Remera Verano Visible" in search_names, "Busqueda API debe incluir verano visible")
            assert_true("Remera Verano Oculto" not in search_names, "Busqueda API debe excluir visible false")

            main._variants = {
                ("verano-visible", "negro", "2"): {
                    "product_id": "verano-visible", "color": "Negro", "size": "2", "stock": 5
                },
                ("verano-oculto", "negro", "2"): {
                    "product_id": "verano-oculto", "color": "Negro", "size": "2", "stock": 5
                },
            }
            variant_ids = {variant["product_id"] for variant in main.list_variants()}
            assert_true("verano-visible" in variant_ids, "API de variantes debe incluir productos visibles")
            assert_true("verano-oculto" not in variant_ids, "API de variantes debe excluir visible false")

            page = main.product_page(request_for("/product/remera-verano-visible"), "remera-verano-visible")
            assert_true(page.status_code == 200, "Pagina individual debe renderizar verano visible")
            expect_http_error(
                404,
                lambda: main.product_page(
                    request_for("/product/remera-verano-oculto"), "remera-verano-oculto"
                ),
                "Pagina individual debe responder 404 para visible false",
            )
        finally:
            main.DATA_FILE = original_data_file
            main._products_cache = original_cache
            main._products_mtime = original_mtime
            main._products_json_cache = original_json_cache
            main._variants = original_variants


if __name__ == "__main__":
    run()
    print("season_visibility_backend_tests: passed")
