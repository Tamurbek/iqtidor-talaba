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

# II QISM — Yangi Nizom (2026, 41 modda) bo'yicha qolgan integratsiya

> 2026-11-18 dagi to'liq audit natijasida tuzildi. Tartib: avval kichik va saralashga bevosita ta'sir qiluvchi bandlar, keyin hisobot/nazorat, oxirida infratuzilma.

## BOSQICH 5 — Individual rejani talaba, ilmiy rahbar va tyutor bilan kelishish
**Nizom:** 18, 17.3, 16.2-modda
**Holat:** [x] Tugallandi — 2026-11-18

- [x] 5.1. `development_plans.student_agreed_at`, `tutor_agreed_at` (migratsiya `d1e2f3a4b5c6`). Talaba o'zi tuzgan reja avtomatik kelishilgan hisoblanadi; qoralama mazmuni o'zgarsa kelishuvlar bekor qilinadi.
- [x] 5.2. Tyutor biriktirilgan talabalarining rejalarini `GET /development-plans` va `GET /development-plans/{student_id}` orqali ko'radi.
- [x] 5.3. `POST /development-plans/{id}/agree` (talaba yoki biriktirilgan tyutor), rahbarga bildirishnoma. Talaba kelishmaguncha reja `active` qilinmaydi.
- [x] 5.4. `DevelopmentPlanTab.tsx`: kelishuv belgilari, "Reja bilan kelishdim" tugmasi, `mode="tutor"` ("Mening talabalarim" bo'limida), rahbar uchun tasdiqlash talaba kelishgunga qadar o'chiq.

Sinov: 13 ta tekshiruv o'tdi (ruxsatlar, kelishuv, qayta kelishuv, faollashtirish cheklovi, bildirishnomalar).

## BOSQICH 6 — Yakuniy ro'yxat eksporti va reyting ogohlantirishi
**Nizom:** 13 (III bo'lim yakuni), 32-modda
**Holat:** [x] Tugallandi — 2026-11-18

- [x] 6.1. Excel/PDF eksportiga "Ilmiy rahbar", "Ilmiy mavzu" ustunlari qo'shildi.
- [x] 6.2. `RANKING_DISCLAIMER` (`app/services/ranking.py`) — `/achievements/ranking` javobida va Excel/PDF oxirida.
- [x] 6.3. `utils/nizom.ts`; `RankingExportTab.tsx` va talabaning `RatingTab.tsx` sahifasida ko'rsatiladi ("10 baravarigacha rag'bat" degan kafolat matni olib tashlandi).

Sinov: reyting javobi, Excel sarlavhalari va PDF eksport tekshirildi.

## BOSQICH 7 — Saralash davri, kvota va komissiya xulosasi
**Nizom:** 8, 14.5-modda
**Holat:** [x] Tugallandi — 2026-11-18

- [x] 7.1. `app/models/selection_period.py` (`selection_periods`): nomi, o'quv yili, buyruq raqami, muddat, kvota, `commission_member_ids` (migratsiya `e2f3a4b5c6d7`).
- [x] 7.2. `gifted_applications.period_id`, `score_at_review`, `tier_at_review`.
- [x] 7.3. `app/api/selection_periods.py`: `GET /selection-periods` (ko'rib chiquvchilar), `GET /current`, `GET /my-commission`, `GET /eligible-members`, `POST`, `PATCH /{id}` (faqat bo'lim boshlig'i). Muddatlar ustma-ust tushmaydi; komissiyaga faqat faol xodimlar; kvota qabul qilinganlardan kam bo'lmaydi.
- [x] 7.4. Ariza faqat ochiq davrda; komissiya tuzilgan bo'lsa qarorni faqat a'zolar (yoki bo'lim boshlig'i) qabul qiladi — a'zoga alohida huquq kerak emas; komissiya xulosasi (izoh) majburiy; kvota to'lsa qabul qilinmaydi; qaror paytidagi ball/daraja saqlanadi; talabaga bildirishnoma.
- [x] 7.5. `SelectionPeriodsPanel.tsx` (davrlar ro'yxati, yaratish/tahrirlash, komissiya tanlash) saralash arizalari bo'limida; jadvalda qaror paytidagi ball/daraja va xulosa; komissiya a'zosiga bo'lim avtomatik ko'rinadi; talaba sahifasida davr holati, davr yopiq bo'lsa yuborish o'chiq, rad etilgan talaba yangi davrda qayta topshira oladi.

Sinov: 23 ta tekshiruv o'tdi (davr yo'qligida ariza bloklanishi, ruxsatlar, ustma-ust tushish, komissiya, majburiy xulosa, kvota, bildirishnoma).

> ⚠️ Joriy etishda: bo'lim boshlig'i birinchi saralash davrini yaratmaguncha talabalar saralash arizasini topshira olmaydi.

## BOSQICH 8 — Hammualliflikda mualliflik hissasi
**Nizom:** 14.3-modda
**Holat:** [x] Tugallandi — 2026-11-18

- [x] 8.1. `student_achievements.co_author_count`, `author_share` (migratsiya `f3a4b5c6d7e8`).
- [x] 8.2. `POST /achievements/upload` ixtiyoriy `co_author_count`, `author_share` qabul qiladi (yakka muallif — 100%, hissa ko'rsatilmasa — teng ulush, hammualliflikda 100% emas); tavsiya etiladigan ball = indikator bali × hissa. `/my` va `/all` javoblarida qaytadi.
- [x] 8.3. `UploadTab.tsx`: nashr/patent/loyiha turlari uchun "Mualliflar soni" va "Mualliflik hissasi, %" maydonlari; `AchievementsApprovalTab.tsx` da hammualliflik ma'lumoti ko'rsatiladi (tasdiqlash oynasidagi tavsiya bal hissaga mutanosib).

Sinov: 14 ta tekshiruv o'tdi (hissa bo'yicha ball, teng ulush, yakka muallif, noto'g'ri qiymatlar, eski formatdagi yuklash).

## BOSQICH 9 — Semestr hisobotlari va monitoringni kengaytirish
**Nizom:** 29, 30-modda
**Holat:** [x] Tugallandi — 2026-11-18

- [x] 9.1. `app/models/semester_report.py` (`semester_reports`: `individual` / `faculty_summary`, semestr kodi `YYYY-YYYY-1|2`, avtomatik statistika `stats_json`), migratsiya `a4b5c6d7e8f9`.
- [x] 9.2. `app/api/semester_reports.py`: `GET /current-semester`, `POST /semester-reports` (rahbar/tyutor; qayta yuborilsa yangilanadi), `GET /my`, `GET /semester-reports` (bo'lim — hammasi, koordinator — o'z fakulteti), `POST /faculty-summary` (koordinator umumlashtiradi, bo'lim boshliqlariga bildirishnoma). Scheduler: 15-yanvar va 15-iyunda hisobot topshirmaganlarga eslatma (`remind_semester_reports`).
- [x] 9.3. `get_students_monitoring_data`: GPA, tasdiqlangan yutuqlar, nashrlar (Scopus/OAK/konferensiya/patent), tanlov arizalari, davr ichidagi yutuqlar, oxirgi yangilanish va `data_stale` (90+ kun). Summary: o'rtacha GPA, jami nashrlar/tanlov arizalari, ma'lumoti eskirgan talabalar.
- [x] 9.4. `SemesterReportsTab.tsx` ("Semestr hisobotlari" bo'limi: rahbar/tyutor formasi, koordinator umumlashtiruvi, bo'lim uchun filtrli ro'yxat); `MonitoringTab.tsx` ga yangi kartalar va ustunlar.

Sinov: 20 ta tekshiruv o'tdi (monitoring ko'rsatkichlari, hisobot yuborish/yangilash, rollar, fakultet bo'yicha cheklov, umumlashtirish va bildirishnoma, semestr kodlari).

## BOSQICH 10 — Qayta baholash, qoidabuzarliklar, rag'batlantirish
**Nizom:** 5, 31, 36, 16.5, 7.8, 33-modda
**Holat:** [x] Tugallandi — 2026-11-18

- [x] 10.1. `POST /gifted-applications/{id}/revoke` (bo'lim boshlig'i yoki davr komissiyasi; sabab majburiy): `status=revoked`, `revoked_at/by`, `revoke_reason` (migratsiya `b5c6d7e8f9a0`). Talaba va ilmiy rahbarga (rejani qayta ko'rib chiqish uchun) bildirishnoma; tanlov arizasi bloklanadi; talaba keyingi davrda qayta topshira oladi.
- [x] 10.2. `integrity_violations` (`app/models/compliance.py`), `POST/GET /integrity-violations`: bo'lim, o'z fakulteti uchun koordinator, o'z talabasi uchun ilmiy rahbar qayd etadi; yutuq ko'rsatilsa u rad etilib baholashdan chiqariladi; talabaga bildirishnoma; talaba faqat o'zinikini ko'radi.
- [x] 10.3. `incentive_proposals`, `POST/GET /incentive-proposals`, `POST /{id}/decide`: xodimlar talaba/rahbar/tyutorni taklif qiladi (rol mosligi tekshiriladi, o'zini taklif qilib bo'lmaydi), qarorni bo'lim boshlig'i qabul qiladi; nomzod va taklif muallifiga bildirishnoma.
- [x] 10.4. `ComplianceTab.tsx` ("Nazorat va rag'batlantirish" bo'limi, barcha xodimlar uchun; qoidabuzarlik formasi — bo'lim/koordinator/ilmiy rahbar); saralash arizalari jadvalida "Maqomni bekor qilish" tugmasi; talaba sahifasida bekor qilish sababi va qayta topshirish.

Sinov: 27 ta tekshiruv o'tdi (bekor qilish ruxsatlari va oqibatlari, qoidabuzarlik ruxsatlari va yutuqni chiqarish, rag'batlantirish taklifi va qarori, bildirishnomalar).

## BOSQICH 11 — Zaxira nusxa va audit jurnali
**Nizom:** 26-modda
**Holat:** [x] Tugallandi — 2026-11-18

- [x] 11.1. `app/models/audit_log.py` (migratsiya `c6d7e8f9a0b1`), `app/services/audit.py`: `/api/v1` ostidagi POST/PUT/PATCH/DELETE so'rovlari fon rejimida qayd etiladi (login, metod, yo'l, status, IP, davomiylik; so'rov tanasi/parollar saqlanmaydi). 365 kundan eskilari har oyning 1-kuni tozalanadi.
- [x] 11.2. `GET /audit-logs` (faqat super admin; actor, yo'l, metod, sana filtrlari, sahifalash).
- [x] 11.3. `scripts/db_backup.sh` + `docker-compose.backup.yml` (`db-backup` servisi: kunlik `pg_dump -Fc`, 14 kun saqlash, `backups/` gitignore'da). Ishga tushirish: `docker compose -f docker-compose.yml -f docker-compose.backup.yml up -d db-backup` (yoki serverda `COMPOSE_FILE=docker-compose.yml:docker-compose.backup.yml`).

---

Sinov: zaxira nusxa olindi va alohida bazaga `pg_restore` bilan tiklandi (ma'lumotlar va migratsiya versiyasi mos); audit bo'yicha 7 ta tekshiruv o'tdi (yozuvlar, GET qayd etilmasligi, filtr, ruxsatlar).

> ⚠️ Serverda: `docker-compose.yml` git'da kuzatilmaydi, shuning uchun zaxira servisi serverda alohida yoqilishi kerak (yuqoridagi buyruq).

## BOSQICH 12 — Rahbar kvotasi, fakultet/kafedra mas'ullari va xodim rollari
**Nizom:** 10.5, 10.6, 24, 34-modda
**Holat:** [x] Tugallandi — 2026-11-18

- [x] 12.1. Kvota belgilanmagan rahbarga so'rov yuborilmaydi, u so'rovni qabul qila olmaydi va admin ham biriktira olmaydi; kvota to'lgan rahbarga so'rov yuborilmaydi; kvota hozirgi yuklamadan kam qilinmaydi va faqat ilmiy rahbarga belgilanadi.
- [x] 12.2. `dean` (Fakultet dekani) va `department_chair` (Kafedra mudiri) tizim rollari (`seed_data.py`); `User.is_faculty_staff` — reyting, tanlov arizalari, semestr hisobotlari, qoidabuzarliklar va talaba ma'lumotlarida yagona fakultet cheklovi. Kafedra mudiri tanlov/saralash arizalarini ko'rib chiqmaydi.
- [x] 12.3. `_resolve_role()`: `coordinator` → `faculty_coordinator`, noma'lum rol rad etiladi, mos RBAC roli doim biriktiriladi; seed mavjud `coordinator` foydalanuvchilarini avtomatik tuzatadi. Admin formasida ilmiy rahbar, tyutor, dekan, kafedra mudiri.
- [x] 12.4. `utils/roles.ts` yangi rollar uchun imkoniyatlar; `UsersTab` rol belgilari; `SupervisorTab`da "Kvota belgilanmagan" rahbar tanlanmaydi.

---

Sinov: 26 ta tekshiruv o'tdi (kvota qoidalari, legacy rol tuzatilishi, dekan/kafedra mudiri cheklovlari, yangi rollarni yaratish).

> ⚠️ Joriy etishda: hozirgi ilmiy rahbarlarning kvotasi belgilanmagan — bo'lim boshlig'i "Ilmiy rahbar so'rovlari" bo'limida har biriga kvota belgilamaguncha talabalar so'rov yubora olmaydi.

## Ishlash tartibi bo'yicha eslatma
1. Har bosqichni alohida branch/commitda bajarish tavsiya etiladi.
2. Backend qismi tugagach frontend bilan integratsiyani tekshirish, so'ng checkbox belgilash.
3. Bosqich ichidagi tartib ham muhim — avval model/migratsiya, keyin schema, keyin API, keyin frontend.
4. Har bosqich tugagach shu faylga qaytib, "Holat" qatoriga sana va qisqa izoh yozing (masalan: `[x] Tugallandi — 2026-11-20`).
