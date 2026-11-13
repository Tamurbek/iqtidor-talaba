# Nizom bo'yicha tayyorlanmagan qismlar — ishlab chiqish rejasi

> Har bir bosqich tugagach `[ ]` ni `[x]` ga o'zgartiring va "Holat" qatoriga sanani yozing.
> Tartib: avval "qisman tayyor" (eng kam ish talab qiladigan), keyin "umuman yo'q" bosqichlar — oson va asos bo'ladigan narsadan qiyiniga.

---

## BOSQICH 0 — Tutor roli funksionalligi (qisman tayyor → tugallash)
**Nizom:** 24-modda, 17-modda
**Holat:** [x] Tugallandi — 2026-11-13 (0.1-0.5 barchasi bajarildi)

Hozir: `app/models/role.py` da `code="tutor"` roli bor (yoki `ROLE_LABELS` da nom bor), lekin unga tegishli hech qanday endpoint/sahifa yo'q.

- [x] 0.1. `app/models/user.py` dagi `ROLE_LABELS`/role kodlarini tekshirib, "tutor" kodi borligini tasdiqlash — `ROLE_CODE_TO_NAME["tutor"] = "Tyutor"` (app/models/user.py:16) mavjud ekanligi tasdiqlandi.
- [x] 0.2. Backend: `app/api/deps.py` ga `require_tutor` yoki umumiy rol tekshiruvchi dependency qo'shish — `get_current_tutor()` qo'shildi (app/api/deps.py).
- [x] 0.3. Backend: tutorga biriktirilgan talabalar ro'yxatini qaytaruvchi endpoint — `app/models/tutor_assignment.py` (yangi `tutor_assignments` jadvali, migratsiya `e5f6a7b8c9d0`), `app/api/tutor.py`: `GET /api/v1/tutor/students` (tyutor o'zinikini ko'radi) va `POST /api/v1/tutor/assign/{student_id}` (admin biriktiradi, notification yuboriladi).
- [x] 0.4. Frontend: `TutorTab.tsx` yangilandi — endi `GET /tutor/students`ni chaqirib, biriktirilgan talabalar ro'yxatini ko'rsatadi (placeholder olib tashlandi).
- [x] 0.5. Sidebar/nav: `AdminSidebar.tsx` ga "Mening talabalarim" (`tutor-students`) menyu punkti, `utils/roles.ts` ga `canViewTutorStudents` capability, `types/admin.ts` ga `AdminTabKey` qo'shildi; `AdminDashboardPage.tsx` da ulandi.

---

## BOSQICH 1 — Bildirishnoma (notifications) tizimi
**Nizom:** 23.6, 23.8-modda
**Holat:** [x] Tugallandi — 2026-11-13

Eng ko'p keyingi bosqichlar shunga tayanadi (uchrashuv eslatmasi, reja muddati eslatmasi va h.k.), shu sababli avval shuni qurish maqsadga muvofiq.

- [x] 1.1. `app/models/notification.py` yaratildi: `id, user_id, title, body, type, is_read, created_at, related_entity_type, related_entity_id`
- [x] 1.2. Migratsiya yozildi: `migrations/versions/c3d4e5f6a7b8_notifications.py` (head = b2c3d4e5f6a7 ustiga)
- [x] 1.3. `app/schemas/notification.py` yaratildi (`NotificationResponse`, `NotificationListResponse`)
- [x] 1.4. `app/api/notifications.py`: `GET /api/v1/notifications` (sahifalangan, `unread_count` bilan), `PATCH /api/v1/notifications/{id}/read`, `PATCH /api/v1/notifications/read-all`
- [x] 1.5. `app/services/notifications.py` — `notify(db, user_id, title, body, type, related_entity_type, related_entity_id)` helper funksiyasi (boshqa modullar BOSQICH 2-4'da shu orqali chaqiradi)
- [x] 1.6. Frontend: `frontend/src/api/client.ts` ga `getNotifications`/`markNotificationRead`/`markAllNotificationsRead` qo'shildi
- [x] 1.7. Frontend: `NotificationBell.tsx` yaratildi va `CabinetTopbar.tsx` ga ulandi (qo'ng'iroq ikonka + dropdown, 60s polling, CSS `style.css` ga qo'shildi)

---

## BOSQICH 2 — Individual rivojlanish rejasi
**Nizom:** 7.3, 16.2, 23.4-modda
**Holat:** [x] Tugallandi — 2026-11-13

- [x] 2.1. `app/models/development_plan.py` yaratildi: `id, student_id, supervisor_id, goal, tasks (JSON), start_date, end_date, status (draft/active/completed), created_at, updated_at`
- [x] 2.2. (ixtiyoriy) — alohida `development_task` jadvali kerak emas deb topildi; vazifalar `tasks` JSON ustunida `{title, deadline, status, result_note}` ro'yxati sifatida saqlanadi (`app/schemas/development_plan.py:DevelopmentTaskItem`).
- [x] 2.3. Migratsiya yozildi: `migrations/versions/d4e5f6a7b8c9_development_plans.py` (head = c3d4e5f6a7b8 ustiga)
- [x] 2.4. `app/schemas/development_plan.py` yaratildi (`DevelopmentPlanCreate`, `DevelopmentPlanUpdate`, `DevelopmentPlanResponse`, `DevelopmentPlanWithStudent`)
- [x] 2.5. `app/api/development_plans.py` (prefiks `/api/v1`, loyihadagi boshqa barcha endpointlar kabi):
  - `POST /api/v1/development-plans` — talaba yoki rahbar yaratadi
  - `GET /api/v1/development-plans/me` — talaba o'zinikini ko'radi
  - `GET /api/v1/development-plans` — rahbar o'ziga biriktirilgan barcha talabalarning rejalarini ko'radi (sahifalangan, talaba ismi bilan)
  - `GET /api/v1/development-plans/{student_id}` — rahbar (yoki admin) o'z talabasinikini ko'radi
  - `PATCH /api/v1/development-plans/{id}` — rahbar (yoki admin) tasdiqlaydi/o'zgartiradi (16.1-16.4)
- [x] 2.6. Reja yaratilganda/yangilanganda `app/services/notifications.py:notify()` chaqiriladi (talaba yaratsa -> rahbarga, rahbar yangilasa -> talabaga)
- [x] 2.7. Frontend: yangi `DevelopmentPlanTab.tsx` yaratildi — talaba tomoni (reja yaratish formasi, vazifalar ro'yxati, tarix), `DashboardPage.tsx`da `development-plan` tab + `CabinetSidebar.tsx`da menyu punkti sifatida ulandi.
- [x] 2.8. Frontend: professor/rahbar kabineti uchun reja tasdiqlash UI — `DevelopmentPlanTab.tsx`ga `mode="supervisor"` qo'shildi, `AdminDashboardPage.tsx`da `supervisor-requests` tab ichida `SupervisorTab` bilan birga ko'rsatiladi (tasdiqlash/yakunlash tugmalari).

Backend to'liq qo'lda sinaldi (login -> POST -> GET/me -> notify -> PATCH approve -> notify), barcha qadamlar 200 OK qaytardi; test yozuvlari keyin tozalandi.

---

## BOSQICH 3 — Uchrashuvlar jurnali
**Nizom:** 20-modda (oyiga kamida 1 marta)
**Holat:** [ ] Boshlanmagan

- [ ] 3.1. `app/models/meeting.py` yaratish: `id, student_id, supervisor_id, tutor_id (nullable), meeting_date, summary, agreed_tasks, created_by, created_at`
- [ ] 3.2. Migratsiya yozish
- [ ] 3.3. `app/schemas/meeting.py`
- [ ] 3.4. `app/api/meetings.py`: CRUD — rahbar/tyutor yozadi, talaba ko'radi
- [ ] 3.5. Backend: oyiga 1 marta uchrashuv bo'lmasa ogohlantirish logikasi (BOSQICH 4 monitoring bilan birga ishlaши mumkin)
- [ ] 3.6. Frontend: `SupervisorTab.tsx`/`TutorTab.tsx` ichida uchrashuvlar tarixi va yangi yozuv qo'shish formasi

---

## BOSQICH 4 — Monitoring va hisobot tizimi
**Nizom:** VII bo'lim (28-32-modda), 12-modda
**Holat:** [ ] Boshlanmagan

Bu bosqich BOSQICH 1-3 ustiga quriladi (ma'lumotlar manbai sifatida ulardan foydalanadi), shu sababli oxiriga qoldirilgan.

- [ ] 4.1. Backend: `app/services/monitoring.py` — har bir talaba uchun: oxirgi uchrashuv sanasi, reja bajarilish foizi, faollik balli hisoblovchi funksiyalar
- [ ] 4.2. Backend: "faolligi pasaygan talaba" aniqlash logikasi (masalan, 1 oydan ortiq uchrashuv yo'q yoki reja muddati o'tgan) + shunga notification yuborish
- [ ] 4.3. `app/api/monitoring.py`: mas'ul bo'lim uchun umumlashtirilgan hisobot endpointi (`GET /api/monitoring/summary`, filterlar bilan)
- [ ] 4.4. Oylik/semestrlik avtomatik hisobot generatsiyasi (cron yoki scheduled task — mavjud infratuzilmaga qarab, masalan APScheduler yoki oddiy on-demand endpoint)
- [ ] 4.5. Frontend: admin panelga `MonitoringTab.tsx` — mas'ul bo'lim uchun umumiy monitoring paneli (23.9-modda)
- [ ] 4.6. Frontend: "faolligi pasaygan talabalar" ro'yxati admin panelda ajratib ko'rsatiladi

---

## Ishlash tartibi bo'yicha eslatma
1. Har bosqichni alohida branch/commitda bajarish tavsiya etiladi.
2. Backend qismi tugagach frontend bilan integratsiyani tekshirish, so'ng checkbox belgilash.
3. Bosqich ichidagi tartib ham muhim — avval model/migratsiya, keyin schema, keyin API, keyin frontend.
4. Har bosqich tugagach shu faylga qaytib, "Holat" qatoriga sana va qisqa izoh yozing (masalan: `[x] Tugallandi — 2026-11-20`).
