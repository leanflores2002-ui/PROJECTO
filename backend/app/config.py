from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


def _csv(value: str | None) -> tuple[str, ...]:
    return tuple(item.strip().rstrip("/") for item in (value or "").split(",") if item.strip())


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    environment: str
    database_url: str | None
    database_pool_size: int
    allowed_origins: tuple[str, ...]
    public_frontend_origin: str | None
    admin_frontend_origin: str | None
    supabase_url: str | None
    supabase_service_role_key: str | None
    supabase_jwt_secret: str | None
    supabase_jwks_url: str | None
    admin_path: str
    catalog_source: str

    @property
    def cors_origins(self) -> list[str]:
        origins = list(self.allowed_origins)
        for origin in (self.public_frontend_origin, self.admin_frontend_origin):
            clean = (origin or "").strip().rstrip("/")
            if clean and clean not in origins:
                origins.append(clean)
        if self.environment == "development":
            for origin in ("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000"):
                if origin not in origins:
                    origins.append(origin)
        if self.environment == "production" and "*" in origins:
            raise RuntimeError("ALLOWED_ORIGINS no puede contener '*' en production")
        return origins

    @property
    def jwt_issuer(self) -> str | None:
        if not self.supabase_url:
            return None
        return f"{self.supabase_url.rstrip('/')}/auth/v1"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    environment = os.getenv("ENVIRONMENT", "development").strip().lower()
    supabase_url = os.getenv("SUPABASE_URL") or None
    return Settings(
        environment=environment,
        database_url=os.getenv("DATABASE_URL") or None,
        database_pool_size=max(1, int(os.getenv("DATABASE_POOL_SIZE", "5"))),
        allowed_origins=_csv(os.getenv("ALLOWED_ORIGINS")),
        public_frontend_origin=os.getenv("PUBLIC_FRONTEND_ORIGIN") or None,
        admin_frontend_origin=os.getenv("ADMIN_FRONTEND_ORIGIN") or None,
        supabase_url=supabase_url,
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY") or None,
        supabase_jwt_secret=os.getenv("SUPABASE_JWT_SECRET") or None,
        supabase_jwks_url=os.getenv("SUPABASE_JWKS_URL") or (
            f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json" if supabase_url else None
        ),
        admin_path=os.getenv("ADMIN_PATH", "/admin").strip() or "/admin",
        catalog_source=os.getenv("ROMIX_CATALOG_SOURCE", "json").strip().lower(),
    )


def reset_settings_cache() -> None:
    get_settings.cache_clear()
