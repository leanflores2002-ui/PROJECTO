# Backend ROMIX

FastAPI conserva las rutas y vistas públicas existentes y agrega una API administrativa separada.

- API heredada compatible: `/api/products`, `/api/products/{slug}`, `/api/search`, `/api/variants`, `/api/orders`.
- API pública nueva: `/api/public/orders` (PostgreSQL, transaccional).
- API admin protegida: `/api/admin/*`.
- Health checks: `/api/health` y `/api/health/ready`.

Desarrollo:

```bash
python -m venv .venv
pip install -r backend/requirements-dev.txt
uvicorn backend.app.main:app --reload --port 8000
pytest backend/tests -q
```

El catálogo continúa usando JSON por defecto (`ROMIX_CATALOG_SOURCE=json`) hasta completar y verificar la migración.
