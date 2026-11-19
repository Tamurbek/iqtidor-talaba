import logging
import os
import secrets
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.role_utils import get_assigned_roles_for_user
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.user import Token, UserResponse
from app.services import hemis_oauth
from app.services.hemis_oauth import HemisOAuthError

logger = logging.getLogger("iqtidorli_hemis_oauth")

router = APIRouter(prefix="/auth/hemis", tags=["HEMIS OAuth"])

STATE_COOKIE = "hemis_oauth_state"
STATE_TTL_SECONDS = 600
TWO_DAYS_SECONDS = 48 * 3600


def _is_secure(request: Request) -> bool:
    return request.url.scheme == "https" or os.getenv("COOKIE_SECURE", "false").lower() in ("true", "1", "yes")


def _login_redirect(request: Request, **params: str) -> RedirectResponse:
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"{request.scope.get('root_path', '')}/login?{query}", status_code=status.HTTP_302_FOUND)


@router.get("/portals")
async def hemis_portals():
    return {name: hemis_oauth.get_portal(name) is not None for name in hemis_oauth.PORTALS}


@router.get("/{portal}/login")
async def hemis_login(portal: str, request: Request):
    cfg = hemis_oauth.get_portal(portal)
    if not cfg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bu HEMIS portali orqali kirish sozlanmagan")

    state = f"{portal}_{secrets.token_hex(24)}"
    response = RedirectResponse(hemis_oauth.build_authorize_url(cfg, state), status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key=STATE_COOKIE,
        value=state,
        httponly=True,
        secure=_is_secure(request),
        max_age=STATE_TTL_SECONDS,
        samesite="lax",
        path=settings.COOKIE_PATH,
    )
    return response


async def _resolve_user(portal: str, info: dict, db: AsyncSession) -> Optional[User]:
    if portal == "student":
        hemis_id = info["student_id_number"] or info["login"]
        user = (await db.execute(select(User).where(User.hemis_id == hemis_id))).scalar_one_or_none()
        # Talaba avtomatik yaratilmaydi: admin HEMIS'dan import qilgan bo'lishi shart
        if not user:
            return None
        if user.role == "student":
            user.full_name = info["full_name"]
            for field in ("faculty", "direction", "group_name", "course", "image_url"):
                if info[field] is not None:
                    setattr(user, field, info[field])
        await db.commit()
        await db.refresh(user)
        return user

    # Xodimlar ham avtomatik yaratilmaydi: admin qo'shgan (login = HEMIS login/ID) akkaunt bo'lishi shart
    candidates = [c for c in (info["login"], info["employee_id_number"]) if c]
    user = (await db.execute(select(User).where(User.hemis_id.in_(candidates)))).scalars().first()
    if user:
        if not user.image_url and info["image_url"]:
            user.image_url = info["image_url"]
        await db.commit()
        await db.refresh(user)
    return user


@router.get("/callback")
async def hemis_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stored_state = request.cookies.get(STATE_COOKIE)

    def fail(reason: str) -> RedirectResponse:
        resp = _login_redirect(request, hemis_error=reason)
        resp.delete_cookie(STATE_COOKIE, path=settings.COOKIE_PATH)
        return resp

    if not state or not stored_state or not secrets.compare_digest(state, stored_state):
        logger.warning("HEMIS OAuth: state mos kelmadi")
        return fail("state")
    if error or not code:
        return fail("denied")

    portal = state.split("_", 1)[0]
    cfg = hemis_oauth.get_portal(portal)
    if not cfg:
        return fail("portal")

    try:
        info = await hemis_oauth.fetch_user(cfg, code)
    except HemisOAuthError as e:
        logger.warning(f"HEMIS OAuth ({portal}) xatosi: {e}")
        return fail("hemis")
    except Exception:
        logger.exception(f"HEMIS OAuth ({portal}) kutilmagan xato")
        return fail("hemis")

    user = await _resolve_user(portal, info, db)
    if not user:
        logger.info(f"HEMIS OAuth ({portal}): akkaunt tizimga import qilinmagan (login={info['login']})")
        return fail("not_registered")
    if not user.is_active:
        return fail("inactive")

    access_token = create_access_token(subject=user.hemis_id, expires_delta=timedelta(days=2))
    response = _login_redirect(request, hemis="success")
    response.delete_cookie(STATE_COOKIE, path=settings.COOKIE_PATH)
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=_is_secure(request),
        max_age=TWO_DAYS_SECONDS,
        samesite="lax",
        path=settings.COOKIE_PATH,
    )
    logger.info(f"HEMIS OAuth ({portal}) orqali kirdi: user_id={user.id}")
    return response


@router.post("/session", response_model=Token)
async def hemis_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Callback qo'ygan HttpOnly cookie asosida SPA uchun token va foydalanuvchini qaytaradi."""
    access_token = create_access_token(subject=current_user.hemis_id, expires_delta=timedelta(days=2))
    user_response = UserResponse.model_validate(current_user)
    user_response.assigned_roles = await get_assigned_roles_for_user(current_user, db)
    return Token(access_token=access_token, token_type="bearer", user=user_response)
