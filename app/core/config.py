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

    def __init__(self, **values):
        super().__init__(**values)
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
