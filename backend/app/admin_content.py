from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from .database import database_connection
from .security import AdminPrincipal, require_admin, require_roles

router = APIRouter(tags=["admin"])


class BannerWrite(BaseModel):
    title: str | None = Field(default=None, max_length=180)
    body: str | None = Field(default=None, max_length=500)
    link_url: str | None = Field(default=None, max_length=1000)
    public_url: str = Field(min_length=1, max_length=2000)
    storage_path: str = Field(min_length=1, max_length=1000)
    alt_text: str = Field(min_length=1, max_length=250)
    status: Literal["draft", "published", "hidden"] = "draft"
    position: int = Field(default=0, ge=0, le=10000)


class SizeGuideWrite(BaseModel):
    key: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=180)
    audience: Literal["mujer", "hombre", "ninos"] | None = None
    category_id: UUID | None = None
    content: dict[str, Any] = Field(default_factory=dict)
    status: Literal["draft", "published", "hidden"] = "draft"


class SettingWrite(BaseModel):
    value: Any
    is_public: bool = False


def _audit(connection, admin: AdminPrincipal, action: str, entity_type: str, entity_id: UUID | None, details: dict) -> None:
    connection.execute(
        """
        insert into public.audit_logs (admin_user_id, action, entity_type, entity_id, details)
        values (%s, %s, %s, %s, %s)
        """,
        (admin.user_id, action, entity_type, entity_id, Jsonb(details)),
    )


@router.get("/banners")
def list_banners(admin: AdminPrincipal = Depends(require_admin)):
    del admin
    with database_connection() as connection:
        return connection.execute(
            """
            select id, title, body, link_url, storage_path, public_url, alt_text,
                   status, position, starts_at, ends_at, created_at, updated_at
            from public.banners
            order by position, created_at desc
            """
        ).fetchall()


@router.post("/banners", status_code=status.HTTP_201_CREATED)
def create_banner(
    payload: BannerWrite,
    admin: AdminPrincipal = Depends(require_roles("superadmin", "admin", "operator")),
):
    with database_connection() as connection, connection.transaction():
        row = connection.execute(
            """
            insert into public.banners
                (title, body, link_url, storage_path, public_url, alt_text, status, position)
            values (%s, %s, %s, %s, %s, %s, %s, %s)
            returning *
            """,
            (payload.title, payload.body, payload.link_url, payload.storage_path, payload.public_url,
             payload.alt_text, payload.status, payload.position),
        ).fetchone()
        _audit(connection, admin, "banner.created", "banner", row["id"], {"title": row["title"]})
        return row


@router.put("/banners/{banner_id}")
def update_banner(
    banner_id: UUID,
    payload: BannerWrite,
    admin: AdminPrincipal = Depends(require_roles("superadmin", "admin", "operator")),
):
    with database_connection() as connection, connection.transaction():
        row = connection.execute(
            """
            update public.banners
            set title=%s, body=%s, link_url=%s, storage_path=%s, public_url=%s,
                alt_text=%s, status=%s, position=%s, updated_at=now()
            where id=%s
            returning *
            """,
            (payload.title, payload.body, payload.link_url, payload.storage_path, payload.public_url,
             payload.alt_text, payload.status, payload.position, banner_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Banner no encontrado")
        _audit(connection, admin, "banner.updated", "banner", banner_id, {"title": row["title"], "status": row["status"]})
        return row


@router.get("/size-guides")
def list_size_guides(admin: AdminPrincipal = Depends(require_admin)):
    del admin
    with database_connection() as connection:
        return connection.execute(
            """
            select id, key, title, audience, category_id, content, status, created_at, updated_at
            from public.size_guides
            order by audience nulls first, title
            """
        ).fetchall()


@router.post("/size-guides", status_code=status.HTTP_201_CREATED)
def create_size_guide(
    payload: SizeGuideWrite,
    admin: AdminPrincipal = Depends(require_roles("superadmin", "admin", "operator")),
):
    with database_connection() as connection, connection.transaction():
        row = connection.execute(
            """
            insert into public.size_guides (key, title, audience, category_id, content, status)
            values (%s, %s, %s, %s, %s, %s)
            returning *
            """,
            (payload.key.strip(), payload.title.strip(), payload.audience, payload.category_id,
             Jsonb(payload.content), payload.status),
        ).fetchone()
        _audit(connection, admin, "size_guide.created", "size_guide", row["id"], {"key": row["key"]})
        return row


@router.put("/size-guides/{guide_id}")
def update_size_guide(
    guide_id: UUID,
    payload: SizeGuideWrite,
    admin: AdminPrincipal = Depends(require_roles("superadmin", "admin", "operator")),
):
    with database_connection() as connection, connection.transaction():
        row = connection.execute(
            """
            update public.size_guides
            set key=%s, title=%s, audience=%s, category_id=%s, content=%s, status=%s, updated_at=now()
            where id=%s
            returning *
            """,
            (payload.key.strip(), payload.title.strip(), payload.audience, payload.category_id,
             Jsonb(payload.content), payload.status, guide_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Guia de talles no encontrada")
        _audit(connection, admin, "size_guide.updated", "size_guide", guide_id, {"key": row["key"], "status": row["status"]})
        return row


@router.get("/settings")
def list_settings(admin: AdminPrincipal = Depends(require_admin)):
    del admin
    with database_connection() as connection:
        return connection.execute(
            "select key, value, is_public, updated_at from public.settings order by key"
        ).fetchall()


@router.put("/settings/{key}")
def upsert_setting(
    key: str,
    payload: SettingWrite,
    admin: AdminPrincipal = Depends(require_roles("superadmin", "admin")),
):
    clean_key = key.strip().lower().replace(" ", "_")
    if not clean_key or len(clean_key) > 120:
        raise HTTPException(status_code=400, detail="Clave de configuracion invalida")
    with database_connection() as connection, connection.transaction():
        row = connection.execute(
            """
            insert into public.settings (key, value, is_public, updated_by)
            values (%s, %s, %s, %s)
            on conflict (key) do update
            set value=excluded.value, is_public=excluded.is_public,
                updated_by=excluded.updated_by, updated_at=now()
            returning key, value, is_public, updated_at
            """,
            (clean_key, Jsonb(payload.value), payload.is_public, admin.user_id),
        ).fetchone()
        _audit(connection, admin, "setting.updated", "setting", None, {"key": clean_key})
        return row
