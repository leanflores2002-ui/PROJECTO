"""Security regression checks; no inventory writes or startup hooks."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from backend.app import main

payload = {"name": '</script><script>alert("x")</script>', "value": "\u2028&<>"}
encoded = main.script_json(payload)
assert "<" not in encoded and "&" not in encoded
assert json.loads(encoded) == payload
client = TestClient(main.app)
public = client.get("/", headers={"Origin": "https://untrusted.example"})
assert public.status_code == 200
assert "access-control-allow-origin" not in public.headers
assert "x-robots-tag" not in public.headers
assert public.headers["x-content-type-options"] == "nosniff"
api = client.get("/api/health")
assert api.headers["x-robots-tag"] == "noindex, follow"
assert client.get("/missing-seo-test").status_code == 404
print("seo_backend_tests: passed (script JSON, CORS, security headers, public indexing, 404)")
