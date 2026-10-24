# O'zMU Jizzax Filiali - Iqtidorli Talabalar Portali (Prototip)

Ushbu loyiha O'zbekiston Milliy universiteti Jizzax filiali **"Iqtidorli talabalarning ilmiy-tadqiqot faoliyatini tashkil etish bo'limi"** uchun tayyorlangan rasmiy veb-sayt prototipidir. Loyiha dizayni `src/` papkasidagi rasmlar asosida 100% moslashtirilgan.

---

## 🚀 Texnologiyalar steki

- **Backend**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11)
- **Database**: [PostgreSQL 16](https://www.postgresql.org/) + SQLAlchemy 2.0 (Asinxron `asyncpg`)
- **Frontend**: Jinja2 Templates + Zamonaviy Vanilla CSS3 + Modern JavaScript (Mobile Responsive)
- **Authentication**: HEMIS ID orqali kirish (JWT token + HttpOnly cookies)
- **Deployment**: Docker & Docker Compose

---

## 🎨 Dizayn asosidagi sahifalar

1. **Bosh sahifa (`/`)**:
   - `src/image.png` dagi dizayn
   - Hero qismi: Shavkat Mirziyoyev iqtibosi, to'q sariq "Kirish" tugmasi, talabalar fotosurati
   - Bo'lim haqida umumiy ma'lumot va "Batafsil" tugmasi
   - Hujjatlar bo'limi (Baholash me'zonlari, PDF yuklab olish)
   - So'nggi yangiliklar (Milliy liboslar haftaligi, Konstitutsiya tadbiri, Zakovat)
   - E'lonlar va tanlovlar bo'limi ("Konstitutsiya bilimdoni", "Huquq bilimdonlari", "Talant shou", "Ijodkor yozuvchi talabalar")
   - To'liq footer (Manzil, rasmiy veb-sayt, elektron pochta, ijtimoiy tarmoqlar)

2. **Matbuot xizmati (`/matbuot-xizmati`)**:
   - `src/image copy.png` dagi dizayn
   - Katta poster banner va o'ng tomondagi vertikal tanlovlar ro'yxati (Talant shou, Media loyihalar, Startaplar, QVZ)

3. **Kirish sahifasi (`/login`)**:
   - `src/image copy 2.png` dagi dizayn
   - HEMIS ID va parol kiritish
   - Parolni ko'rish/yashirish (ko'z ikonchasi)
   - "Eslab qol" va "Parolni unitdingizmi?" tugmalari
   - Bitta bosish bilan test ma'lumotlarini to'ldirish

4. **Talaba kabineti (`/dashboard`)**:
   - HEMIS talaba ma'lumotlari (Ism, Fakultet, Yo'nalish, Kurs, Guruh)
   - Iqtidor reyting bali, chop etilgan maqolalar va faol tanlovlar statistikasi
   - Tanlov va stipendiyalarga ariza topshirish
   - Yutuq yoki sertifikat yuklash formasi

5. **API Hujjatlari**:
   - Swagger UI: `http://localhost:8000/api/docs`
   - ReDoc: `http://localhost:8000/api/redoc`

---

## 🐳 Docker orqali serverda ishga tushirish

Loyiha serverda Docker va Docker Compose orqali to'liq avtomatlashtirilgan. Baza jadvallari va boshlang'ich ma'lumotlar birinchi ishga tushganda avtomatik ravishda yuklanadi (`seed`).

### 1. Loyihani yuklab oling va papkaga kiring:
```bash
cd "Iqtidorli talabalar"
```

### 2. Docker compose orqali ishga tushiring:
```bash
docker compose up --build -d
```

### 3. Konteynerlar holatini tekshirish:
```bash
docker compose ps
docker compose logs -f web
```

### 4. Saytga kirish:
Brauzeringizda oching:
👉 **http://localhost:8000** yoki server IP manzili: **http://SERVER_IP:8000**

---

## 🔑 Sinov uchun HEMIS hisoblari

| Rol | HEMIS ID (Login) | Parol | Ma'lumot |
|---|---|---|---|
| **Talaba** | `3852011001` | `talaba123` | Abdullayev Jasur Olimjon o'g'li (Dasturiy injiniring, 3-kurs) |
| **Admin** | `admin` | `admin123` | Iqtidorli talabalar bo'limi boshlig'i |

---

## 📁 Loyiha katalog tuzilishi

```
Iqtidorli talabalar/
├── app/
│   ├── api/             # FastAPI marshrutlari (auth, news, announcements, documents)
│   ├── core/            # Sozlamalar (config), baza ulanishi (database), xavfsizlik (security)
│   ├── models/          # SQLAlchemy ma'lumotlar bazasi modellari
│   ├── schemas/         # Pydantic schemalari
│   ├── services/        # Dastlabki ma'lumotlarni yuklash (seed_data)
│   ├── static/          # CSS, JS va rasmlar (kesilgan logotip va bannerlar)
│   ├── templates/       # HTML Jinja2 shablonlari
│   └── main.py          # FastAPI asosiy kirish fayli
├── src/                 # Asl dizayn skrinshotlari
├── Dockerfile           # Web container ta'rifi
├── docker-compose.yml   # PostgreSQL + FastAPI orkestrasi
├── requirements.txt     # Python kutubxonalari
├── .env                 # Konfiguratsiya o'zgaruvchilari
└── README.md
```
