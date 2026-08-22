"""ROMIX backend application package."""

from . import admin_api as _admin_api
from .admin_extra import router as _admin_extra_router

# Keep main.py stable while extending the existing /api/admin router.
_admin_api.router.include_router(_admin_extra_router)
