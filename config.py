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
    POSTGRES_DB: str = "propusk_system"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    
    # JWT токены
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 часа
    
    # Приложение
    APP_NAME: str = "Система управления пропусками"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False

    def model_post_init(self, __context) -> None:
        if not self.DATABASE_URL:
            self.DATABASE_URL = (
                "postgresql+psycopg://"
                f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )


# Создаём экземпляр настроек
settings = Settings()
