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

### BOSQICH 0.6 — Tyutor vazifalarining qolgan qismlari (17.1, 17.2, 17.4-modda)
**Holat:** [x] Tugallandi — 2026-11-14

- [x] 0.6.1. 17.4-modda (qiyinchilik/yordam chorasi): `Meeting` modeliga `has_concern`, `concern_note`, `help_action` qo'shildi (migratsiya `a9b8c7d6e5f4`); `app/api/meetings.py`da yaratish/tahrirlashda saqlanadi, qiyinchilik qayd etilganda (tyutor yozgan bo'lsa) ilmiy rahbarga bildirishnoma yuboriladi; `MeetingsTab.tsx`da forma va tarixda ko'rsatiladi (talaba o'ziga tegishli yordam chorasini ham ko'radi).
- [x] 0.6.2. 17.1-modda (faollik/uchrashuv kuzatuvi): `app/services/monitoring.py`ga `student_ids`/`tutor_scoped` parametrlari qo'shildi; `GET /api/v1/tutor/monitoring` — faqat o'ziga biriktirilgan talabalar bo'yicha faollik balli va uchrashuv muddati holatini qaytaradi; `TutorTab.tsx`da har bir talaba qatorida ko'rsatiladi.
- [x] 0.6.3. 17.2-modda (to'garak/tadbir/imkoniyat haqida xabardor qilish): `POST /api/v1/tutor/notify/{student_id}` (bitta talaba) va `POST /api/v1/tutor/notify-all` (barcha biriktirilganlar) — umumiy `notify()` helper orqali bildirishnoma yuboradi; `TutorTab.tsx`da "Xabar yuborish" va "Barchasiga xabar yuborish" formalari qo'shildi.

Hali qoplanmagan: 17.1-moddadagi "o'quv intizomi, davomat" — HEMIS'da bu ma'lumot (davomat) uchun API mavjud emas, shuning uchun faqat uchrashuv muddati va individual reja bajarilishi asosidagi faollik balli bilan cheklandi.

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
**Holat:** [x] Tugallandi — 2026-11-13

- [x] 3.1. `app/models/meeting.py` yaratildi: `id, student_id, supervisor_id, tutor_id (nullable), meeting_date, summary, agreed_tasks, created_by, created_at`
- [x] 3.2. Migratsiya yozildi: `migrations/versions/f1a2b3c4d5e6_meetings.py` (head = e5f6a7b8c9d0 ustiga)
- [x] 3.3. `app/schemas/meeting.py` yaratildi (`MeetingCreate`, `MeetingUpdate`, `MeetingResponse`, `MeetingWithStudent`)
- [x] 3.4. `app/api/meetings.py` (prefiks `/api/v1`):
  - `GET /api/v1/meetings/my-students` — rahbar/tyutorga biriktirilgan talabalar (forma uchun)
  - `POST /api/v1/meetings` — rahbar yoki tyutor yozadi (faqat o'ziga biriktirilgan talaba uchun)
  - `GET /api/v1/meetings/me` — talaba o'z uchrashuvlar tarixini ko'radi
  - `GET /api/v1/meetings` — rahbar/tyutor o'zi yozgan barcha uchrashuvlarni ko'radi (sahifalangan, talaba ismi bilan)
  - `GET /api/v1/meetings/{student_id}` — rahbar/tyutor/admin bitta talabaning tarixini ko'radi
  - `PATCH /api/v1/meetings/{id}`, `DELETE /api/v1/meetings/{id}` — yozuvni yaratgan rahbar/tyutor (yoki admin) tahrirlaydi/o'chiradi
- [x] 3.5. `app/services/meetings.py`: `find_students_without_monthly_meeting()` va `notify_overdue_monthly_meetings()` — oyiga 1 marta uchrashuv bo'lmasa aniqlash/ogohlantirish logikasi tayyor, lekin hali hech qayerdan chaqirilmaydi (chaqirish BOSQICH 4 scheduler'iga qoldirildi)
- [x] 3.6. Frontend: yangi `MeetingsTab.tsx` yaratildi (`mode="student"/"supervisor"/"tutor"`) — `AdminDashboardPage.tsx`da `supervisor-requests` tabida `SupervisorTab`+`DevelopmentPlanTab` yoniga, `tutor-students` tabida `TutorTab` yoniga ulandi; talaba tomoni uchun `DashboardPage.tsx`da yangi `meetings` tab + `CabinetSidebar.tsx`da "Uchrashuvlar jurnali" menyu punkti qo'shildi.

Backend to'liq qo'lda sinaldi (talaba/rahbar/tyutor/admin rollari uchun create/list/me/{student_id}/patch/delete, va `find_students_without_monthly_meeting` funksiyasi), barcha qadamlar kutilgan natijani qaytardi; test yozuvlari keyin tozalandi. Frontend `tsc --noEmit` xatosiz o'tdi.

---

## BOSQICH 4 — Monitoring va hisobot tizimi
**Nizom:** VII bo'lim (28-32-modda), 12-modda
**Holat:** [x] Tugallandi — 2026-11-13

Bu bosqich BOSQICH 1-3 ustiga quriladi (ma'lumotlar manbai sifatida ulardan foydalanadi), shu sababli oxiriga qoldirilgan.

- [x] 4.1. Backend: `app/services/monitoring.py` yaratildi — `get_students_monitoring_data()` har bir talaba uchun oxirgi uchrashuv sanasi (`app/models/meeting.py`), individual reja bajarilish foizi (`DevelopmentPlan.tasks` JSON) va `compute_activity_score()` orqali faollik ballini hisoblaydi.
- [x] 4.2. "Faolligi pasaygan talaba" (`is_at_risk`): 1 oydan ortiq uchrashuv yo'q (mavjud `app/services/meetings.py:find_students_without_monthly_meeting()` kengaytirilgan) YOKI reja muddati o'tgan (`end_date < now`, `status != completed`). `notify_at_risk_students()` — `notify_overdue_monthly_meetings()` + yangi `_notify_overdue_plans()` orqali talaba va rahbarga `notify()` yuboradi.
- [x] 4.3. `app/api/monitoring.py` (prefiks `/api/v1`): `GET /monitoring/summary` (umumlashtirilgan hisobot, fakultet/kurs/yo'nalish filtri bilan), `GET /monitoring/students` (sahifalangan, `only_at_risk` filtri bilan har bir talaba bo'yicha monitoring).
- [x] 4.4. Oylik/semestrlik hisobot: `GET /monitoring/report?period=monthly|semester` — on-demand endpoint (summary + faolligi pasaygan talabalar ro'yxati). `POST /monitoring/notify-at-risk` — 4.2 bildirishnomalarini qo'lda ishga tushirish endpointi. Scheduler ulandi: `app/core/scheduler.py` (APScheduler, `AsyncIOScheduler`), `notify_at_risk_students()` har kuni soat 09:00da avtomatik ishga tushadi, `app/main.py` lifespan'ga ulangan.
- [x] 4.5. Frontend: `MonitoringTab.tsx` yaratildi — statistik kartalar (jami talaba, faolligi pasayganlar, o'rtacha faollik/reja bajarilishi), fakultet/kurs/yo'nalish filtri, "bildirishnoma yubor" tugmasi. `AdminDashboardPage.tsx`ga `monitoring` tab sifatida ulandi (faqat `canViewMonitoring` = department_head darajasi, `utils/roles.ts` va `AdminSidebar.tsx`da menyu punkti qo'shildi).
- [x] 4.6. Frontend: jadvaldagi har bir qator `is_at_risk`ga qarab qizil fon va "Faolligi pasaygan" belgisi bilan ajratiladi; "Faqat faolligi pasaygan talabalar" checkbox orqali alohida ro'yxat sifatida ham ko'rish mumkin.

Backend to'liq qo'lda sinaldi (admin sifatida: `/monitoring/summary`, `/monitoring/students` (oddiy va `only_at_risk=true`), `/monitoring/report`, `POST /monitoring/notify-at-risk`), barcha qadamlar kutilgan natijani qaytardi (1 ta faolligi pasaygan talaba to'g'ri aniqlandi va bildirishnoma yuborildi). Frontend `tsc --noEmit` xatosiz o'tdi.

---

## Ishlash tartibi bo'yicha eslatma
1. Har bosqichni alohida branch/commitda bajarish tavsiya etiladi.
2. Backend qismi tugagach frontend bilan integratsiyani tekshirish, so'ng checkbox belgilash.
3. Bosqich ichidagi tartib ham muhim — avval model/migratsiya, keyin schema, keyin API, keyin frontend.
4. Har bosqich tugagach shu faylga qaytib, "Holat" qatoriga sana va qisqa izoh yozing (masalan: `[x] Tugallandi — 2026-11-20`).
