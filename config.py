"""
Конфигурация приложения
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Настройки приложения
    Можно переопределить через переменные окружения или .env файл
    """
    
    # База данных
    DATABASE_URL: str | None = None
    POSTGRES_DB: str | None = None
    POSTGRES_USER: str | None = None
    POSTGRES_PASSWORD: str | None = None
    POSTGRES_HOST: str | None = None
    POSTGRES_PORT: int = 5432
    
    # JWT токены
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 часа
    
    # Приложение
    # Telegram login
    TELEGRAM_BOT_TOKEN: str | None = None
    TELEGRAM_AUTH_MAX_AGE_SECONDS: int = 60 * 60 * 24  # 24 hours
    TELEGRAM_WELCOME_MESSAGE: str = "Авторизация выполнена. Добро пожаловать!"
    N8N_TG_WELCOME_WEBHOOK_URL: str | None = None

    # CORS
    CORS_ALLOW_ORIGINS: str = "http://localhost:8000,http://127.0.0.1:8000,https://parking.kinoteka.space/"

    # Cookies
    COOKIE_SECURE: bool = True
    COOKIE_SAMESITE: str = "strict"
    CSRF_COOKIE_NAME: str = "csrf_token"
    CSRF_HEADER_NAME: str = "X-CSRF-Token"
    LAST_ACTIVE_COOKIE_NAME: str = "last_active"
    SESSION_IDLE_TIMEOUT_SECONDS: int = 2 * 60 * 60


    APP_NAME: str = "Система управления пропусками"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def cors_allow_origins_list(self) -> list[str]:
        raw = self.CORS_ALLOW_ORIGINS or ""
        return [origin.strip() for origin in raw.split(",") if origin.strip()]


    def model_post_init(self, __context) -> None:
        if not self.SECRET_KEY:
            raise ValueError("SECRET_KEY must be set via environment")
        if not self.DATABASE_URL:
            missing = [
                name
                for name in [
                    "POSTGRES_DB",
                    "POSTGRES_USER",
                    "POSTGRES_PASSWORD",
                    "POSTGRES_HOST",
                ]
                if not getattr(self, name)
            ]
            if missing:
                raise ValueError(
                    "DATABASE_URL or POSTGRES_* must be set via environment"
                )
            self.DATABASE_URL = (
                "postgresql+psycopg://"
                f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )


# Создаём экземпляр настроек
settings = Settings()
