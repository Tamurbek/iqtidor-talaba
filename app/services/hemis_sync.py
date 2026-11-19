"""
HEMIS'dan talaba va xodimlar ro'yxatini sinxronlash.

"Shaxsga doir ma'lumotlar to'g'risida"gi Qonun (ZRU-547) talabiga ko'ra faqat portal
vazifasi uchun zarur maydonlar saqlanadi. HEMIS javobidagi passport_pin, birth_date,
phone, email, address, gender, country/province/district, socialCategory, povertyLevel,
accommodation, image va h.k. hech qayerga yozilmaydi (hatto logga ham).
"""
import asyncio
import logging
from datetime import datetime
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.hemis_sync import HemisEmployee, HemisSyncRun
from app.models.user import User
from app.services.tutor_groups import apply_tutor_groups, link_hemis_tutor_groups
from app.services.hemis_roles import sync_employee_accounts

logger = logging.getLogger("hemis_sync")

PAGE_SIZE = 200
TIMEOUT = 30.0
STUDYING_STATUS_CODE = "11"  # "O'qimoqda"
EMPLOYEE_ACTIVE_STATUS_CODES = ("11", "12")  # "Ishlamoqda", "Ta'tilda" ("14" = "Bo'shagan")
FACULTY_STRUCTURE_CODE = "11"  # structureType: "Fakultet"

_lock = asyncio.Lock()
_background_tasks: set = set()


class HemisSyncError(Exception):
    pass


def _name(raw: Dict[str, Any], key: str) -> Optional[str]:
    val = raw.get(key)
    if isinstance(val, dict):
        val = val.get("name")
    if val is None:
        return None
    val = str(val).strip()
    return val or None


def _code(raw: Dict[str, Any], key: str) -> Optional[str]:
    val = raw.get(key)
    return str(val.get("code")) if isinstance(val, dict) and val.get("code") is not None else None


def _course(raw: Dict[str, Any]) -> Optional[int]:
    digits = "".join(ch for ch in (_name(raw, "level") or "") if ch.isdigit())
    return int(digits) if digits else None


def _gpa(raw: Dict[str, Any]) -> float:
    try:
        return float(raw.get("avg_gpa") or 0.0)
    except (TypeError, ValueError):
        return 0.0


def student_fields(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """HEMIS talaba yozuvidan faqat ruxsat etilgan akademik maydonlar."""
    hemis_id = str(raw.get("student_id_number") or "").strip()
    full_name = _name(raw, "full_name") or _name(raw, "short_name")
    if not hemis_id or not full_name:
        return None
    return {
        "hemis_id": hemis_id,
        "full_name": full_name,
        "faculty": _name(raw, "department") or _name(raw, "faculty"),
        "direction": _name(raw, "specialty"),
        "group_name": _name(raw, "group"),
        "course": _course(raw),
        "education_type": _name(raw, "educationType"),
        "payment_form": _name(raw, "paymentForm"),
        "avg_gpa": _gpa(raw),
    }


def resolve_faculty(dept: Any, departments: Dict[int, Dict[str, Any]]) -> Optional[str]:
    """Bo'linmadan (kafedra, dekanat) ota bo'linmalar bo'ylab yuqoriga chiqib fakultet nomini topadi."""
    seen: set = set()
    while isinstance(dept, dict):
        if _code(dept, "structureType") == FACULTY_STRUCTURE_CODE:
            return _name(dept, "name")
        parent = dept.get("parent")
        if isinstance(parent, dict):
            parent = parent.get("id")
        if parent is None or parent in seen:
            return None
        seen.add(parent)
        dept = departments.get(parent)
    return None


def employee_fields(raw: Dict[str, Any], departments: Optional[Dict[int, Dict[str, Any]]] = None) -> Optional[Dict[str, Any]]:
    """HEMIS xodim yozuvidan faqat lavozim/bo'linma ma'lumotlari."""
    emp_id = str(raw.get("employee_id_number") or "").strip()
    full_name = _name(raw, "full_name") or _name(raw, "short_name")
    if not emp_id or not full_name:
        return None
    status_code = _code(raw, "employeeStatus")
    return {
        "employee_id_number": emp_id,
        "full_name": full_name,
        "department": _name(raw, "department"),
        "faculty": resolve_faculty(raw.get("department"), departments or {}),
        "position": _name(raw, "staffPosition"),
        "employee_type": _name(raw, "employeeType"),
        "academic_degree": _name(raw, "academicDegree"),
        "academic_rank": _name(raw, "academicRank"),
        "is_active": status_code in (None, *EMPLOYEE_ACTIVE_STATUS_CODES),
        "tutor_groups": tutor_group_names(raw),
    }


def tutor_group_names(raw: Dict[str, Any]) -> List[str]:
    names = [_name(g, "name") for g in (raw.get("tutorGroups") or []) if isinstance(g, dict)]
    return sorted({n for n in names if n})


# Rahbariyat: direktor/rektor, ularning o'rinbosarlari, dekan va o'rinbosarlari, kafedra mudiri
LEADERSHIP_KEYWORDS = ("direktor", "rektor", "dekan", "kafedra mudir")
TEACHING_KEYWORDS = ("o'qituvchi", "professor", "dotsent", "assistent", "tyutor")
EXCLUDED_KEYWORDS = ("xo'jalik", "maslahatchi")


def _norm(text: Optional[str]) -> str:
    text = (text or "").lower()
    for ch in "‘’ʻʼ`´":
        text = text.replace(ch, "'")
    return text


def employee_rank(raw: Dict[str, Any]) -> int:
    """2 = rahbariyat, 1 = professor-o'qituvchi, 0 = olinmaydi (xo'jalik va boshqa xodimlar)."""
    position = _norm(_name(raw, "staffPosition"))
    emp_type = _norm(_name(raw, "employeeType"))
    department = _norm(_name(raw, "department"))
    if any(k in f"{position} {department}" for k in EXCLUDED_KEYWORDS):
        return 0
    if any(k in position for k in LEADERSHIP_KEYWORDS):
        return 2
    if any(k in f"{position} {emp_type}" for k in TEACHING_KEYWORDS):
        return 1
    return 0


def _single(val: Any) -> Dict[str, Any]:
    """HEMIS Swagger'ida `data` va `pagination` ba'zan [ {...} ] ko'rinishida keladi."""
    if isinstance(val, list):
        val = val[0] if val else {}
    return val if isinstance(val, dict) else {}


async def _iter_items(client: httpx.AsyncClient, path: str, params: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    page = 1
    while True:
        try:
            res = await client.get(path, params={**params, "page": page, "limit": PAGE_SIZE})
        except httpx.HTTPError as e:
            raise HemisSyncError(f"{path}: so'rov bajarilmadi ({type(e).__name__})") from e
        if res.status_code in (401, 403):
            raise HemisSyncError(f"{path}: HEMIS token yaroqsiz yoki ruxsat yo'q ({res.status_code})")
        if res.status_code != 200:
            raise HemisSyncError(f"{path}: HEMIS {res.status_code} qaytardi")
        body = res.json()
        data = _single(body.get("data") if isinstance(body, dict) else None)
        items = data.get("items") or []
        for item in items:
            if isinstance(item, dict):
                yield item
        page_count = int(_single(data.get("pagination")).get("pageCount") or 0)
        if not items or (page_count and page >= page_count) or (not page_count and len(items) < PAGE_SIZE):
            return
        page += 1


async def _sync_students(client: httpx.AsyncClient, db: AsyncSession) -> tuple:
    created = updated = 0
    seen: set = set()
    async for raw in _iter_items(client, "/data/student-list", {}):
        if _code(raw, "studentStatus") not in (None, STUDYING_STATUS_CODE):
            continue
        fields = student_fields(raw)
        if not fields or fields["hemis_id"] in seen:
            continue
        seen.add(fields["hemis_id"])

        user = (await db.execute(select(User).where(User.hemis_id == fields["hemis_id"]))).scalar_one_or_none()
        if not user:
            # Parol saqlanmaydi: talaba HEMIS login-paroli bilan kiradi (tekshiruvni HEMIS qiladi)
            db.add(User(**fields, role="student"))
            created += 1
        elif user.role == "student":
            for key, val in fields.items():
                if val is not None and key != "hemis_id":
                    setattr(user, key, val)
            updated += 1
        if (created + updated) % PAGE_SIZE == 0:
            await db.flush()
    await db.flush()
    # Yangi kelgan talabalar o'z guruhining tyutoriga avtomatik biriktiriladi
    await apply_tutor_groups(db)
    await db.commit()
    return created, updated


async def _sync_employees(client: httpx.AsyncClient, db: AsyncSession) -> int:
    # Bitta xodim bir nechta lavozimda bo'lishi mumkin (masalan, dotsent va dekan o'rinbosari):
    # rahbarlik lavozimi ustun, aks holda birinchi yozuv olinadi.
    departments: Dict[int, Dict[str, Any]] = {}
    try:
        async for dept in _iter_items(client, "/data/department-list", {}):
            if dept.get("id") is not None:
                departments[dept["id"]] = dept
    except HemisSyncError as e:
        # Ro'yxat olinmasa ham davom etiladi: dekanlar uchun bo'linmaning o'zi fakultet bo'ladi
        logger.warning(f"Bo'linmalar ro'yxati olinmadi, kafedra fakulteti aniqlanmaydi: {e}")

    best: Dict[str, tuple] = {}
    groups: Dict[str, set] = {}
    positions: Dict[str, set] = {}
    async for raw in _iter_items(client, "/data/employee-list", {"type": "all"}):
        # Ishdan bo'shagan lavozim yozuvlari hisobga olinmaydi (aks holda eski lavozim ustun kelishi mumkin)
        if _code(raw, "employeeStatus") not in (None, *EMPLOYEE_ACTIVE_STATUS_CODES):
            continue
        rank = employee_rank(raw)
        fields = employee_fields(raw, departments) if rank else None
        if not fields:
            continue
        key = fields["employee_id_number"]
        # Tyutor guruhlari va lavozimlar xodimning barcha amaldagi yozuvlaridan yig'iladi
        groups.setdefault(key, set()).update(fields["tutor_groups"])
        if fields["position"]:
            positions.setdefault(key, set()).add(fields["position"])
        if key not in best or rank > best[key][0]:
            best[key] = (rank, fields)
    for key, (_, fields) in best.items():
        fields["tutor_groups"] = ",".join(sorted(groups.get(key, ())))  or None

    now = datetime.utcnow()
    existing = {
        e.employee_id_number: e
        for e in (await db.execute(select(HemisEmployee))).scalars().all()
    }
    for key, (_, fields) in best.items():
        emp = existing.get(key)
        if not emp:
            emp = HemisEmployee(**fields)
            db.add(emp)
        else:
            for attr, val in fields.items():
                setattr(emp, attr, val)
        emp.synced_at = now
    # Ishdan ketgan yoki toifasi o'zgargan xodimlar ma'lumotnomadan o'chiriladi (ortiqcha ma'lumot saqlanmaydi);
    # ularning tizimdagi akkauntlari (users) alohida, bunga tegilmaydi
    removed = [key for key in existing if key not in best]
    for key in removed:
        await db.delete(existing[key])
    await db.flush()
    # Xodim akkauntlari va rollari HEMIS lavozimidan (admin qo'lda tanlamaydi)
    created, updated = await sync_employee_accounts(
        db, {k: f for k, (_, f) in best.items()}, positions, removed
    )
    logger.info(f"Xodim akkauntlari: +{created} yangi, {updated} yangilandi, {len(removed)} chiqib ketgan")
    await link_hemis_tutor_groups(db)
    await db.commit()
    return len(best)


async def run_sync(token: str, trigger: str, triggered_by: Optional[str] = None) -> Optional[int]:
    """To'liq sinxronlash. Boshqa sinxronlash ketayotgan bo'lsa None qaytaradi."""
    if _lock.locked():
        return None
    async with _lock:
        async with AsyncSessionLocal() as db:
            run = HemisSyncRun(trigger=trigger, triggered_by=triggered_by, status="running")
            db.add(run)
            await db.commit()
            await db.refresh(run)
            run_id = run.id

        try:
            async with httpx.AsyncClient(
                base_url=settings.HEMIS_API_URL.rstrip("/"),
                timeout=TIMEOUT,
                headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            ) as client:
                async with AsyncSessionLocal() as db:
                    s_created, s_updated = await _sync_students(client, db)
                async with AsyncSessionLocal() as db:
                    employees = await _sync_employees(client, db)
            status, error = "success", None
        except HemisSyncError as e:
            s_created = s_updated = employees = 0
            status, error = "failed", str(e)
            logger.warning(f"HEMIS sinxronlash #{run_id} muvaffaqiyatsiz: {e}")
        except Exception as e:
            s_created = s_updated = employees = 0
            status, error = "failed", f"Kutilmagan xato: {type(e).__name__}"
            logger.exception(f"HEMIS sinxronlash #{run_id} kutilmagan xato")

        async with AsyncSessionLocal() as db:
            run = await db.get(HemisSyncRun, run_id)
            run.status = status
            run.error = error
            run.students_created = s_created
            run.students_updated = s_updated
            run.employees_synced = employees
            run.finished_at = datetime.utcnow()
            await db.commit()
        logger.info(
            f"HEMIS sinxronlash #{run_id} ({trigger}): {status}; talabalar +{s_created}/~{s_updated}, xodimlar {employees}"
        )
        return run_id


def start_background_sync(token: str, trigger: str, triggered_by: Optional[str] = None) -> bool:
    if _lock.locked():
        return False
    task = asyncio.create_task(run_sync(token, trigger, triggered_by))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return True


def is_running() -> bool:
    return _lock.locked()

