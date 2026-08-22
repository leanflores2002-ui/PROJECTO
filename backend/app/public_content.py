from __future__ import annotations

from fastapi import APIRouter

from .database import database_connection

router = APIRouter(tags=["public"])


@router.get("/banners")
def public_banners():
    with database_connection() as connection:
        return connection.execute(
            """
            select id, title, body, link_url, public_url, alt_text, position
            from public.banners
            where status = 'published'
              and (starts_at is null or starts_at <= now())
              and (ends_at is null or ends_at >= now())
            order by position, created_at
            """
        ).fetchall()


@router.get("/size-guides")
def public_size_guides():
    with database_connection() as connection:
        return connection.execute(
            """
            select id, key, title, audience, category_id, content
            from public.size_guides
            where status = 'published'
            order by audience nulls first, title
            """
        ).fetchall()


@router.get("/settings")
def public_settings():
    with database_connection() as connection:
        rows = connection.execute(
            "select key, value from public.settings where is_public = true order by key"
        ).fetchall()
    return {row['key']: row['value'] for row in rows}
