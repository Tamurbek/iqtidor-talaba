import logging
from dataclasses import dataclass
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import httpx

from app.core.config import settings

logger = logging.getLogger("hemis_oauth")

TIMEOUT = httpx.Timeout(15.0, connect=5.0)
PORTALS = ("student", "employee")


class HemisOAuthError(Exception):
    pass


@dataclass(frozen=True)
class PortalConfig:
    name: str
    base_url: str
    userinfo_path: str
    client_id: str
    client_secret: str

    @property
    def enabled(self) -> bool:
        return bool(self.client_id and self.client_secret)


def get_portal(name: str) -> Optional[PortalConfig]:
    if name == "student":
        base, userinfo = settings.HEMIS_OAUTH_STUDENT_BASE_URL, settings.HEMIS_OAUTH_STUDENT_USERINFO_PATH
    elif name == "employee":
        base, userinfo = settings.HEMIS_OAUTH_BASE_URL, settings.HEMIS_OAUTH_USERINFO_PATH
    else:
        return None
    cfg = PortalConfig(name, base.rstrip("/"), userinfo,
                       settings.HEMIS_OAUTH_CLIENT_ID, settings.HEMIS_OAUTH_CLIENT_SECRET)
    return cfg if cfg.enabled else None


def build_authorize_url(portal: PortalConfig, state: str) -> str:
    query = urlencode({
        "response_type": "code",
        "client_id": portal.client_id,
        "redirect_uri": settings.HEMIS_OAUTH_REDIRECT_URI,
        "state": state,
    })
    return f"{portal.base_url}{settings.HEMIS_OAUTH_AUTHORIZE_PATH}?{query}"


def _unwrap(payload: Any) -> Dict[str, Any]:
    if isinstance(payload, dict) and isinstance(payload.get("data"), dict):
        return {**payload, **payload["data"]}
    return payload if isinstance(payload, dict) else {}


def _first(raw: Dict[str, Any], *keys: str) -> Optional[str]:
    for key in keys:
        val = raw.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
    return None


def _nested_name(raw: Dict[str, Any], key: str) -> Optional[str]:
    val = raw.get(key)
    if isinstance(val, dict):
        return _first(val, "name")
    return str(val) if isinstance(val, str) and val.strip() else None


async def fetch_user(portal: PortalConfig, code: str) -> Dict[str, Any]:
    """code -> access_token -> /oauth/api/user. Normallashgan dict qaytaradi."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            token_res = await client.post(
                f"{portal.base_url}{settings.HEMIS_OAUTH_TOKEN_PATH}",
                data={
                    "grant_type": "authorization_code",
                    "client_id": portal.client_id,
                    "client_secret": portal.client_secret,
                    "redirect_uri": settings.HEMIS_OAUTH_REDIRECT_URI,
                    "code": code,
                },
                headers={"Accept": "application/json"},
            )
        except httpx.HTTPError as e:
            raise HemisOAuthError(f"token so'rovi bajarilmadi: {type(e).__name__}") from e
        if token_res.status_code != 200:
            raise HemisOAuthError(f"token endpoint {token_res.status_code} qaytardi")

        access_token = _first(_unwrap(token_res.json()), "access_token")
        if not access_token:
            raise HemisOAuthError("token javobida access_token yo'q")

        try:
            user_res = await client.get(
                f"{portal.base_url}{portal.userinfo_path}",
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            )
        except httpx.HTTPError as e:
            raise HemisOAuthError(f"user so'rovi bajarilmadi: {type(e).__name__}") from e
        if user_res.status_code != 200:
            raise HemisOAuthError(f"user endpoint {user_res.status_code} qaytardi")

    raw = _unwrap(user_res.json())
    login = _first(raw, "login", "username", "student_id_number", "employee_id_number")
    if not login:
        raise HemisOAuthError("user javobida login yo'q")

    picture = _first(raw, "picture", "image", "avatar")
    if picture and not picture.startswith(("http://", "https://")):
        picture = portal.base_url + ("" if picture.startswith("/") else "/") + picture

    course = None
    level_digits = "".join(ch for ch in (_nested_name(raw, "level") or "") if ch.isdigit())
    sem_digits = "".join(ch for ch in (_nested_name(raw, "semester") or "") if ch.isdigit())
    if level_digits:
        course = int(level_digits)
    elif sem_digits:
        course = (int(sem_digits) + 1) // 2

    # Zero-PII: email, telefon va h.k. olinmaydi
    return {
        "login": login,
        "student_id_number": _first(raw, "student_id_number"),
        "employee_id_number": _first(raw, "employee_id_number"),
        "full_name": _first(raw, "full_name", "name") or login,
        "type": _first(raw, "type"),
        "image_url": picture,
        "faculty": _nested_name(raw, "faculty"),
        "direction": _nested_name(raw, "specialty"),
        "group_name": _nested_name(raw, "group"),
        "course": course,
    }
