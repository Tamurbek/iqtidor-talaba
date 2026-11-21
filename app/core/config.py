import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "O'zMU Jizzax filiali - Iqtidorli Talabalar Portali"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-for-iqtidorli-talabalar-change-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # PostgreSQL Database
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "talaba_user")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "talaba_pass_2026")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "db")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "iqtidorli_db")

    DATABASE_URL: str = ""

    # Redis (brute-force/rate-limit holatini worker/konteynerlar orasida ulashish uchun)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Demo/test ma'lumotlarini seed qilish - productionda HECH QACHON yoqilmasin
    SEED_DEMO_DATA: bool = os.getenv("SEED_DEMO_DATA", "false").lower() == "true"

    # Swagger/ReDoc/OpenAPI - productionda o'chiq; lokalda ENABLE_API_DOCS=true
    ENABLE_API_DOCS: bool = os.getenv("ENABLE_API_DOCS", "false").lower() == "true"

    # Birinchi admin: ikkalasi berilsa va bunday login bazada bo'lmasa, startda yaratiladi
    ADMIN_LOGIN: str = os.getenv("ADMIN_LOGIN", "")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")
    ADMIN_FULL_NAME: str = os.getenv("ADMIN_FULL_NAME", "Tizim administratori")

    # Nizom 14.2-modda: HEMIS'dagi GPA shkalasi (5 ballik bo'lsa GPA*4; boshqa shkalada 20 ballga mutanosib)
    GPA_SCALE: float = float(os.getenv("GPA_SCALE", "5"))

    # Auth cookie'lari shu yo'l bilan cheklanadi, aks holda jbnuu.uz domenidagi boshqa
    # tizimlarga ham yuboriladi (va ularning bir xil nomli cookie'lari bilan to'qnashadi).
    COOKIE_PATH: str = os.getenv("COOKIE_PATH") or "/"

    # HEMIS OAuth 2.0 (SSO). Xodimlar hemis.*, talabalar student.* portali orqali kiradi.
    # Bitta mijoz (client) ikkala portal uchun ishlatiladi; client_id bo'sh bo'lsa SSO o'chiq.
    HEMIS_OAUTH_BASE_URL: str = os.getenv("HEMIS_OAUTH_BASE_URL", "https://hemis.jbnuu.uz")
    HEMIS_OAUTH_STUDENT_BASE_URL: str = os.getenv("HEMIS_OAUTH_STUDENT_BASE_URL", "https://student.jbnuu.uz")
    HEMIS_OAUTH_AUTHORIZE_PATH: str = os.getenv("HEMIS_OAUTH_AUTHORIZE_PATH", "/oauth/authorize")
    HEMIS_OAUTH_TOKEN_PATH: str = os.getenv("HEMIS_OAUTH_TOKEN_PATH", "/oauth/access-token")
    HEMIS_OAUTH_USERINFO_PATH: str = os.getenv(
        "HEMIS_OAUTH_USERINFO_PATH",
        "/oauth/api/user?fields=id,uuid,type,roles,name,login,picture,university_id,departments,employee_id_number",
    )
    HEMIS_OAUTH_STUDENT_USERINFO_PATH: str = os.getenv(
        "HEMIS_OAUTH_STUDENT_USERINFO_PATH",
        "/oauth/api/user?fields=id,uuid,type,name,login,picture,university_id,group,faculty,level,semester,specialty",
    )
    HEMIS_OAUTH_CLIENT_ID: str = os.getenv("HEMIS_OAUTH_CLIENT_ID", "")
    HEMIS_OAUTH_CLIENT_SECRET: str = os.getenv("HEMIS_OAUTH_CLIENT_SECRET", "")
    # HEMIS admin panelidagi "URL manzil" bilan bitma-bit mos bo'lishi shart
    HEMIS_OAUTH_REDIRECT_URI: str = os.getenv(
        "HEMIS_OAUTH_REDIRECT_URI", "https://jbnuu.uz/iqtidorli-talaba/login"
    )

    # HEMIS Backend API (talaba/xodim ro'yxatlari). Token HEMIS admin panelida admin foydalanuvchiga
    # "API User" roli berilganda olinadi; bo'sh bo'lsa import o'chiq.
    HEMIS_API_URL: str = os.getenv("HEMIS_API_URL", "https://student.jbnuu.uz/rest/v1")
    HEMIS_API_TOKEN: str = os.getenv("HEMIS_API_TOKEN", "")

    def __init__(self, **values):
        super().__init__(**values)
        # APP_BASE_PATH bo'sh (lokal, ildizda) bo'lsa COOKIE_PATH ham bo'sh keladi
        if not self.COOKIE_PATH:
            self.COOKIE_PATH = "/"
        # Check if asyncpg is installed and we are inside Docker
        has_asyncpg = False
        try:
            import asyncpg
            has_asyncpg = True
        except ImportError:
            has_asyncpg = False

        if not has_asyncpg or (not os.getenv("IN_DOCKER") and self.POSTGRES_SERVER == "db"):
            # Seamless local development fallback
            self.DATABASE_URL = "sqlite+aiosqlite:///./iqtidorli.db"
        elif not self.DATABASE_URL:
            self.DATABASE_URL = (
                f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
