from pathlib import Path

from scripts.migration.import_products import load_products, validate


ROOT = Path(__file__).resolve().parents[2]


def test_products_json_is_complete_and_migratable():
    source = ROOT / "frontend" / "public" / "assets" / "data" / "products.json"
    products = load_products(source)
    report = validate(products)
    assert report["valid"], report["errors"]
    assert report["products"] == 157
    assert report["variants"] > report["products"]
    assert report["uniqueImages"] > report["products"]
