from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from fastapi import HTTPException, status
from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import get_settings


_pool: ConnectionPool | None = None


def open_database_pool() -> None:
    global _pool
    settings = get_settings()
    if not settings.database_url or _pool is not None:
        return
    _pool = ConnectionPool(
        conninfo=settings.database_url,
        min_size=0,
        max_size=settings.database_pool_size,
        open=True,
        kwargs={"row_factory": dict_row},
    )


def close_database_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def get_database_pool() -> ConnectionPool:
    if _pool is None:
        open_database_pool()
    if _pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La base de datos no esta configurada",
        )
    return _pool


@contextmanager
def database_connection() -> Iterator[Connection]:
    pool = get_database_pool()
    with pool.connection() as connection:
        yield connection


def database_health() -> bool:
    try:
        with database_connection() as connection:
            row = connection.execute("select 1 as ok").fetchone()
            return bool(row and row["ok"] == 1)
    except Exception:
        return False
