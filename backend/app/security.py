from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Callable
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings
from .database import database_connection


bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AdminPrincipal:
    user_id: UUID
    email: str | None
    role: str
    display_name: str | None


@lru_cache(maxsize=2)
def _jwks_client(url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(url, cache_keys=True)


def _decode_supabase_token(token: str) -> dict:
    settings = get_settings()
    issuer = settings.jwt_issuer
    if not issuer:
        raise HTTPException(status_code=503, detail="Supabase Auth no esta configurado")

    options = {"require": ["exp", "sub", "aud"]}
    try:
        header = jwt.get_unverified_header(token)
        algorithm = str(header.get("alg") or "")
        if algorithm == "HS256" and settings.supabase_jwt_secret:
            key = settings.supabase_jwt_secret
        elif settings.supabase_jwks_url:
            key = _jwks_client(settings.supabase_jwks_url).get_signing_key_from_jwt(token).key
        else:
            raise HTTPException(status_code=503, detail="No hay clave JWT/JWKS configurada")
        return jwt.decode(
            token,
            key=key,
            algorithms=[algorithm],
            audience="authenticated",
            issuer=issuer,
            options=options,
        )
    except HTTPException:
        raise
    except (jwt.PyJWTError, ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token administrativo invalido o vencido",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AdminPrincipal:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere autenticacion administrativa",
            headers={"WWW-Authenticate": "Bearer"},
        )
    claims = _decode_supabase_token(credentials.credentials)
    try:
        user_id = UUID(str(claims["sub"]))
    except (KeyError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=401, detail="Token sin identificador valido") from exc

    with database_connection() as connection:
        profile = connection.execute(
            """
            select user_id, role, display_name
            from public.admin_profiles
            where user_id = %s and is_active = true
            """,
            (user_id,),
        ).fetchone()
    if not profile:
        raise HTTPException(status_code=403, detail="El usuario no es un administrador activo")
    return AdminPrincipal(
        user_id=user_id,
        email=claims.get("email"),
        role=profile["role"],
        display_name=profile["display_name"],
    )


def require_roles(*allowed_roles: str) -> Callable:
    def dependency(admin: AdminPrincipal = Depends(require_admin)) -> AdminPrincipal:
        if admin.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="El rol no permite esta operacion")
        return admin

    return dependency
