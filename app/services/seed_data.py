import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.news import News
from app.models.announcement import Announcement
from app.models.document import Document
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

async def seed_initial_data(db: AsyncSession):
    # 1. Seed Users (HEMIS)
    user_check = await db.execute(select(User).limit(1))
    if not user_check.scalar_one_or_none():
        users = [
            User(
                hemis_id="3852011001",
                full_name="Abdullayev Jasur Olimjon o'g'li",
                hashed_password=get_password_hash("talaba123"),
                role="student",
                faculty="Amaliy matematika va axborot texnologiyalari",
                direction="Dasturiy injiniring",
                group_name="941-21",
                course=3
            ),
            User(
                hemis_id="3852011002",
                full_name="Karimova Nilufar Bahodir qizi",
                hashed_password=get_password_hash("talaba123"),
                role="student",
                faculty="Amaliy matematika va axborot texnologiyalari",
                direction="Amaliy matematika",
                group_name="942-20",
                course=4
            ),
            User(
                hemis_id="3852011003",
                full_name="Rustamov Shavkat Akbar o'g'li",
                hashed_password=get_password_hash("talaba123"),
                role="student",
                faculty="Iqtisodiyot va boshqaruv",
                direction="Raqamli iqtisodiyot",
                group_name="911-22",
                course=2
            ),
            User(
                hemis_id="admin",
                full_name="Iqtidorli talabalar bo'limi boshlig'i",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                faculty="Boshqaruv"
            )
        ]
        db.add_all(users)
        await db.commit()
        logger.info("Test users seeded successfully.")

    # 2. Seed News
    news_check = await db.execute(select(News).limit(1))
    if not news_check.scalar_one_or_none():
        news_items = [
            News(
                title="Talaba qizlar ishtirokida \"Milliy liboslar haftaligi\" tashkil etildi.",
                slug="milliy-liboslar-haftaligi",
                summary="O'zbekiston Milliy universiteti Jizzax filialida talaba-qizlar o'rtasida milliy qadriyatlarimizni e'zozlash maqsadida haftalik bo'lib o'tdi.",
                content="""O'zbekiston Milliy universiteti Jizzax filialida talaba-qizlar o'rtasida milliy qadriyatlarimiz, urf-odatlarimiz va go'zal an'analarimizni keng targ'ib qilish, milliy liboslarimiz jozibasini namoyon etish maqsadida "Milliy liboslar haftaligi" tantanali tarzda o'tkazildi.

Tadbir doirasida iqtidorli talaba qizlar milliy adras, atlas va beqasam matolaridan tikilgan zamonaviy va milliy liboslar ko'rgazmasini taqdim etdilar. Shuningdek, talabalar milliy raqslar, she'riy kompozitsiyalar va sahna ko'rinishlari bilan ishtirok etdilar.""",
                image_url="/static/images/news-1.png",
                published_date="05.12.2024",
                views=328,
                is_featured=True,
                category="Ma'naviyat"
            ),
            News(
                title="\"Konstitutsiya baxtimiz qomusi\" mavzusidagi ma'naviy-ma'rifiy tadbir bo'lib o'tdi.",
                slug="konstitutsiya-baxtimiz-qomusi",
                summary="Filial kutubxonasida talabalar va professor-o'qituvchilar ishtirokida davra suhbati tashkil etildi.",
                content="""Bosh qomusimiz qabul qilingan sana munosabati bilan filial axborot-resurs markazida iqtidorli talabalar va huquqshunos olimlar ishtirokida davra suhbati tashkil etildi.

Tadbirda yangi tahrirdagi Konstitutsiyaning mazmun-mohiyati, yoshlar huquqlari va ularga yaratilayotgan imkoniyatlar atroflicha tushuntirildi.""",
                image_url="/static/images/news-2.png",
                published_date="04.12.2024",
                views=215,
                is_featured=False,
                category="Tadbir"
            ),
            News(
                title="Talabalar o'rtasida \"Zakovat\" intellektual o'yini tashkil etildi.",
                slug="zakovat-intellektual-oyini",
                summary="Filialning eng iqtidorli talabalari aql jangida o'z bilimlarini sinovdan o'tkazdilar.",
                content="""Iqtidorli talabalarning intellektual salohiyatini yuksaltirish, ularning mantiqiy fikrlash doirasini kengaytirish maqsadida navbatdagi "Zakovat" turniri tashkil etildi.

Bellashuvda filialning turli yo'nalishlaridan 16 ta jamoa ishtirok etib, g'olib jamoalar esdalik sovg'alari va diplomlar bilan taqdirlandilar.""",
                image_url="/static/images/news-3.png",
                published_date="03.12.2024",
                views=189,
                is_featured=False,
                category="Intellektual"
            ),
            News(
                title="Talant shou: kuz-qish mavsumi saralash bosqichi start oldi",
                slug="talant-shou-saralash",
                summary="San'at, musiqa va notiqlik yo'nalishlarida iqtidorli yoshlar o'rtasida respublika ko'rik-tanlovi.",
                content="Talant shou loyihasi doirasida filialning eng iqtidorli talabalari saralab olinmoqda.",
                image_url="/static/images/press-item-1.png",
                published_date="06.11.2024",
                views=450,
                is_featured=False,
                category="Tanlov"
            ),
            News(
                title="Talaba-yoshlar hayotiga bog'liq media loyihalar tanlovi",
                slug="media-loyihalar-tanlovi",
                summary="Jurnalistika, blogerlik va media yo'nalishida o'z loyihasiga ega iqtidorli talabalar uchun grant loyihasi.",
                content="Toshkent davlat sharqshunoslik universiteti va hamkor tashkilotlar bilan media tanlov.",
                image_url="/static/images/press-item-2.png",
                published_date="13.10.2024",
                views=310,
                is_featured=False,
                category="Media"
            )
        ]
        db.add_all(news_items)
        await db.commit()
        logger.info("News items seeded successfully.")

    # 3. Seed Announcements
    ann_check = await db.execute(select(Announcement).limit(1))
    if not ann_check.scalar_one_or_none():
        announcements = [
            Announcement(
                title="O'zbekiston Respublikasi Konstitutsiyasi qabul qilinganligining 32-yilligi munosabati bilan tashkil etilgan \"Konstitutsiya bilimdoni\" online tanlovi tashkil etiladi.",
                description="Ushbu onlayn test sinovlari O'zbekiston Respublikasi Konstitutsiyasi qabul qilinganligining 32-yilligi munosabati bilan tashkil etilmoqda. Ishtirokchilar qimmatbaho sovg'alar bilan taqdirlanadi.",
                image_url="/static/images/announcement-1.png",
                deadline="15.12.2024",
                prize="Qimmatbaho planshet va noutbuk",
                category="Onlayn tanlov",
                is_main=True,
                is_active=True
            ),
            Announcement(
                title="Huquq bilimdonlari – Umummilliy Konstitutsiya imtihoni",
                description="Sovrin jamg'armasi 40 million so'm. Adliya vazirligi tomonidan tashkil etilgan umummilliy imtihon.",
                image_url="/static/images/announcement-2.png",
                deadline="20.12.2024",
                prize="40 000 000 so'm",
                category="Respublika",
                is_main=False,
                is_active=True
            ),
            Announcement(
                title="Qizlar libosi – millat libosi ko'rik-tanlovi",
                description="Filial talaba-qizlari o'rtasida milliy liboslar tanlovida ishtirok eting!",
                image_url="/static/images/announcement-3.png",
                deadline="10.12.2024",
                prize="Diplom va esdalik sovg'alar",
                category="Ko'rik-tanlov",
                is_main=False,
                is_active=True
            ),
            Announcement(
                title="Talant shou: 1-tur saralash bosqichi",
                description="O'zbekiston Milliy universiteti Jizzax filiali Yoshlar ittifoqi boshlang'ich tashkiloti bilan hamkorlikda start berildi.",
                image_url="/static/images/announcement-4.png",
                deadline="08.12.2024",
                prize="Maxsus statuetka va rag'batlantirish",
                category="Madaniyat",
                is_main=False,
                is_active=True
            ),
            Announcement(
                title="Ijodkor yozuvchi talabalar diqqatiga!",
                description="Nihol mushoira klubi a'zolarining nasr, nazm yo'nalishida ijod qiluvchi talaba-yoshlarning ijodiy ishlari to'plami uchun qabul boshlandi.",
                image_url="/static/images/announcement-5.png",
                deadline="25.12.2024",
                prize="Kitob shaklida nashr etish",
                category="Adabiyot",
                is_main=False,
                is_active=True
            )
        ]
        db.add_all(announcements)
        await db.commit()
        logger.info("Announcements seeded successfully.")

    # 4. Seed Documents
    doc_check = await db.execute(select(Document).limit(1))
    if not doc_check.scalar_one_or_none():
        docs = [
            Document(
                title="Iqtidorli talabalar reytingini baholash me'zonlari",
                file_url="/static/docs/baholash_mezonlari.pdf",
                file_format="PDF",
                file_size="1.8 MB",
                published_date="07.01.2024",
                download_count=485
            ),
            Document(
                title="O'zMU Jizzax filiali iqtidorli talabalar bilan ishlash bo'limi nizomi",
                file_url="/static/docs/bolim_nizomi.pdf",
                file_format="PDF",
                file_size="2.1 MB",
                published_date="12.01.2024",
                download_count=320
            ),
            Document(
                title="O'zbekiston Respublikasi Prezidenti va nomli davlat stipendiyalari nizomi",
                file_url="/static/docs/stipendiya_nizom.pdf",
                file_format="PDF",
                file_size="3.4 MB",
                published_date="15.02.2024",
                download_count=612
            )
        ]
        db.add_all(docs)
        await db.commit()
        logger.info("Documents seeded successfully.")

    # 5. Seed Achievements
    from app.models.achievement import StudentAchievement
    ach_check = await db.execute(select(StudentAchievement).limit(1))
    if not ach_check.scalar_one_or_none():
        achievements = [
            StudentAchievement(
                user_id=1,
                student_name="Abdullayev Jasur Olimjon o'g'li",
                hemis_id="3852011001",
                faculty="Amaliy matematika va axborot texnologiyalari",
                achievement_type="scopus_wos",
                title="Sun'iy intellekt modellarining tibbiy diagnostikadagi samaradorligi",
                description="Scopus xalqaro bazasidagi jurnalda maqola chop etildi. DOI: 10.1016/j.ai.2024.1024",
                file_url="/static/docs/maqola_jasur.pdf",
                points=4.0,
                status="pending"
            ),
            StudentAchievement(
                user_id=1,
                student_name="Abdullayev Jasur Olimjon o'g'li",
                hemis_id="3852011001",
                faculty="Amaliy matematika va axborot texnologiyalari",
                achievement_type="boshqa",
                title="IELTS 7.5 xalqaro ingliz tili sertifikati",
                description="Overall Band Score 7.5 (C1 level)",
                file_url="/static/docs/ielts_jasur.pdf",
                points=2.0,
                status="approved"
            ),
            StudentAchievement(
                user_id=1,
                student_name="Abdullayev Jasur Olimjon o'g'li",
                hemis_id="3852011001",
                faculty="Amaliy matematika va axborot texnologiyalari",
                achievement_type="innovatsion_loyiha",
                scope="respublika_xalqaro",
                title="Talabalar o'rtasida Respublika dasturlash olimpiadasida 1-o'rin",
                description="O'zbekiston Respublikasi Oliy ta'lim vazirligi diplomi",
                file_url="/static/docs/diplom_olimpiada.pdf",
                points=8.0,
                status="approved"
            ),
            StudentAchievement(
                user_id=2,
                student_name="Karimova Nilufar Bahodir qizi",
                hemis_id="3852011002",
                faculty="Amaliy matematika va axborot texnologiyalari",
                achievement_type="patent",
                title="E-tibbiyot axborot tizimi uchun DGU dasturiy ta'minot guvohnomasi",
                description="Adliya vazirligi huzuridagi intellektual mulk agentligi guvohnomasi",
                file_url="/static/docs/patent_nilufar.pdf",
                points=5.0,
                status="approved"
            ),
            StudentAchievement(
                user_id=3,
                student_name="Rustamov Shavkat Akbar o'g'li",
                hemis_id="3852011003",
                faculty="Iqtisodiyot va boshqaruv",
                achievement_type="oak_maqola",
                title="Raqamli iqtisodiyotda ekotizimlarni rivojlantirish istiqbollari",
                description="OAK ro'yxatidagi iqtisodiy jurnalda maqola",
                file_url="/static/docs/oak_shavkat.pdf",
                points=4.0,
                status="approved"
            )
        ]
        db.add_all(achievements)
        await db.commit()
        logger.info("Student achievements seeded successfully.")


async def seed_roles_and_permissions(db: AsyncSession):
    from app.models.role import Role, Permission

    # 1. Define standard permissions
    perm_definitions = [
        # Guruh sardorlari
        {"code": "starostas.view", "name": "Guruh sardorlari ro'yxatini ko'rish", "module": "starostas"},
        {"code": "starostas.manage", "name": "Guruh sardorini tayinlash va almashtirish", "module": "starostas"},
        # Ilmiy yutuqlar
        {"code": "achievements.view", "name": "Barcha yutuqlarni ko'rish", "module": "achievements"},
        {"code": "achievements.verify", "name": "Yutuqlarni tasdiqlash va rad etish", "module": "achievements"},
        # Tanlovlar
        {"code": "contests.manage", "name": "Tanlovlar va kvotalarni boshqarish", "module": "contests"},
        {"code": "contests.review", "name": "Tanlov arizalarini ko'rib chiqish", "module": "contests"},
        # Iqtidorli talaba sifatida saralash arizasi (Nizom 7.1/10-modda)
        {"code": "gifted_applications.review", "name": "Saralash arizalarini ko'rib chiqish", "module": "gifted_applications"},
        # Test va imtihon
        {"code": "exams.manage", "name": "Savollar bazasi va monitoring", "module": "exams"},
        {"code": "exams.reset", "name": "Imtihon urinishlarini tiklash", "module": "exams"},
        # Tizim va rollar
        {"code": "roles.manage", "name": "Rollar va huquqlarni boshqarish", "module": "roles"},
        {"code": "users.manage", "name": "Foydalanuvchilarni boshqarish", "module": "users"},
        {"code": "reports.view", "name": "Reytinglar va tahliliy hisobotlar", "module": "reports"},
        # Guruh faoliyati (Guruh sardori uchun)
        {"code": "group.view", "name": "O'z guruhi talabalari faoliyatini ko'rish (Guruh sardori)", "module": "group"}
    ]

    existing_perms = (await db.execute(select(Permission))).scalars().all()
    existing_perm_codes = {p.code: p for p in existing_perms}

    for p_def in perm_definitions:
        if p_def["code"] not in existing_perm_codes:
            new_p = Permission(
                code=p_def["code"],
                name=p_def["name"],
                module=p_def["module"],
                description=p_def["name"]
            )
            db.add(new_p)
            existing_perm_codes[p_def["code"]] = new_p
    await db.commit()

    # 2. Define standard roles
    role_definitions = [
        {
            "code": "super_admin",
            "name": "Super Administrator",
            "description": "Tizimning to'liq huquqli boshqaruvchisi",
            "is_system": True,
            "permissions": list(existing_perm_codes.keys())
        },
        {
            "code": "department_head",
            "name": "Iqtidorli bo'lim boshlig'i",
            "description": "Iqtidorli talabalar bilan ishlash bo'limi boshlig'i (guruh sardorlari ro'yxati, saralash va tanlov nazorati)",
            "is_system": True,
            "permissions": [
                "starostas.view", "starostas.manage",
                "achievements.view", "achievements.verify",
                "contests.manage", "contests.review",
                "gifted_applications.review",
                "exams.manage", "exams.reset",
                "reports.view", "users.manage"
            ]
        },
        {
            "code": "faculty_coordinator",
            "name": "Fakultet koordinatori",
            "description": "Fakultet miqyosida talabalar va ularning yutuqlarini tekshiruvchi mas'ul",
            "is_system": True,
            "permissions": ["achievements.view", "achievements.verify", "contests.review", "gifted_applications.review", "reports.view", "starostas.view"]
        },
        {
            "code": "jury_expert",
            "name": "Hakamlar hay'ati / Ekspert",
            "description": "2-bosqich taqdimot va ijodiy ishlarni baholovchi komissiya a'zosi",
            "is_system": True,
            "permissions": ["contests.review", "reports.view"]
        },
        {
            "code": "starosta",
            "name": "Guruh sardori",
            "description": "Guruh yetakchisi / sardori — o'z guruhi talabalarining yutuq va tanlovlardagi qatnashuvini kuzatuvchi",
            "is_system": True,
            "permissions": ["group.view"]
        },
        {
            "code": "supervisor",
            "name": "Ilmiy rahbar",
            "description": "Nizom 16-modda: talabaning ilmiy qiziqishi va tayyorgarligini aniqlovchi, individual reja va tadqiqot natijalarini ko'rib chiquvchi professor-o'qituvchi",
            "is_system": True,
            "permissions": ["achievements.view"]
        },
        {
            "code": "tutor",
            "name": "Tyutor",
            "description": "Nizom 17-modda: talabaning o'quv intizomi, davomati va ijtimoiy-psixologik qo'llab-quvvatlanishini kuzatuvchi mas'ul",
            "is_system": True,
            "permissions": ["group.view"]
        },
        {
            "code": "student",
            "name": "Talaba",
            "description": "Tanlov ishtirokchisi bo'lgan barcha talabalar",
            "is_system": True,
            "permissions": []
        }
    ]

    existing_roles = (await db.execute(select(Role))).scalars().all()
    existing_role_codes = {r.code: r for r in existing_roles}

    for r_def in role_definitions:
        if r_def["code"] not in existing_role_codes:
            role_obj = Role(
                code=r_def["code"],
                name=r_def["name"],
                description=r_def["description"],
                is_system=r_def["is_system"]
            )
            for p_code in r_def["permissions"]:
                if p_code in existing_perm_codes:
                    role_obj.permissions.append(existing_perm_codes[p_code])
            db.add(role_obj)
            existing_role_codes[r_def["code"]] = role_obj
        else:
            # Backfill any permissions added to the definition later (additive-only sync)
            role_obj = existing_role_codes[r_def["code"]]
            current_perm_codes = {p.code for p in role_obj.permissions}
            for p_code in r_def["permissions"]:
                if p_code not in current_perm_codes and p_code in existing_perm_codes:
                    role_obj.permissions.append(existing_perm_codes[p_code])
    await db.commit()

    # 3. Assign initial roles to existing users if not yet assigned
    all_users = (await db.execute(select(User))).scalars().all()
    for u in all_users:
        if not u.roles:
            if u.hemis_id == "admin":
                if "super_admin" in existing_role_codes:
                    u.roles.append(existing_role_codes["super_admin"])
                if "department_head" in existing_role_codes:
                    u.roles.append(existing_role_codes["department_head"])
            elif u.hemis_id == "3852011001":
                if "student" in existing_role_codes:
                    u.roles.append(existing_role_codes["student"])
                if "starosta" in existing_role_codes:
                    u.roles.append(existing_role_codes["starosta"])
            else:
                if "student" in existing_role_codes:
                    u.roles.append(existing_role_codes["student"])
    await db.commit()
    logger.info("Roles and permissions seeded successfully.")
