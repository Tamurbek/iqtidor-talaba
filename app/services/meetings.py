from datetime import datetime, timedelta
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.user import User
from app.models.meeting import Meeting
from app.services.notifications import notify

MONTHLY_MEETING_WINDOW_DAYS = 30


async def find_students_without_monthly_meeting(db: AsyncSession) -> List[User]:
    """Nizom 20-modda: ilmiy rahbari biriktirilgan, lekin so'nggi
    MONTHLY_MEETING_WINDOW_DAYS kun ichida hech qanday uchrashuv yozuvi bo'lmagan
    talabalar ro'yxatini qaytaradi.

    BOSQICH 4 (monitoring/scheduler) bu funksiyani davriy ravishda chaqiradi;
    hozircha faqat funksiya darajasida tayyor turadi, hech qayerdan chaqirilmaydi.
    """
    cutoff = datetime.utcnow() - timedelta(days=MONTHLY_MEETING_WINDOW_DAYS)

    last_meeting_subq = (
        select(Meeting.student_id, func.max(Meeting.meeting_date).label("last_meeting_date"))
        .group_by(Meeting.student_id)
        .subquery()
    )

    res = await db.execute(
        select(User)
        .outerjoin(last_meeting_subq, last_meeting_subq.c.student_id == User.id)
        .where(
            User.supervisor_id.isnot(None),
            (last_meeting_subq.c.last_meeting_date.is_(None)) | (last_meeting_subq.c.last_meeting_date < cutoff),
        )
    )
    return list(res.scalars().all())


async def notify_overdue_monthly_meetings(db: AsyncSession) -> int:
    """Topilgan har bir talaba va uning ilmiy rahbariga ogohlantirish bildirishnomasi yuboradi.

    Qaytaradi: bildirishnoma yuborilgan talabalar soni. BOSQICH 4'da scheduler
    tomonidan chaqirilishi ko'zda tutilgan, hozircha chaqirilmaydi.
    """
    students = await find_students_without_monthly_meeting(db)
    for student in students:
        await notify(
            db,
            user_id=student.id,
            title="Ilmiy rahbaringiz bilan uchrashuv muddati o'tdi",
            body=f"Nizom 20-moddasiga ko'ra oyiga kamida 1 marta uchrashuv o'tkazilishi kerak, so'nggi {MONTHLY_MEETING_WINDOW_DAYS} kunda uchrashuv yozuvi topilmadi.",
            type="meeting_warning",
            related_entity_type="user",
            related_entity_id=student.id,
            commit=False,
        )
        if student.supervisor_id:
            await notify(
                db,
                user_id=student.supervisor_id,
                title=f"{student.full_name} bilan uchrashuv muddati o'tdi",
                body=f"So'nggi {MONTHLY_MEETING_WINDOW_DAYS} kunda uchrashuv yozuvi kiritilmagan.",
                type="meeting_warning",
                related_entity_type="user",
                related_entity_id=student.id,
                commit=False,
            )

    await db.commit()
    return len(students)
