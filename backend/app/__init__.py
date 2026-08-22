"""ROMIX backend application package."""

from . import admin_api as _admin_api
from . import public_api as _public_api
from .admin_extra import router as _admin_extra_router
from .admin_content import router as _admin_content_router
from .public_content import router as _public_content_router

# Keep main.py stable while extending the existing prefixed routers.
_admin_api.router.include_router(_admin_extra_router)
_admin_api.router.include_router(_admin_content_router)
_public_api.router.include_router(_public_content_router)
