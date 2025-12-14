"""
Конфигурация приложения
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """
    Настройки приложения
    Можно переопределить через переменные окружения или .env файл
    """
    
    # База данных
    DATABASE_URL: str = "postgresql://postgres:*********@******/propusk_system"
    
    # JWT токены
    SECRET_KEY: str = "*******"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 часа
    
    # Приложение
    APP_NAME: str = "Система управления пропусками"
    APP_VERSION: str = "0.0.1"
    DEBUG: bool = True
    
    # Telegram (опционально, настроим позже)
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_CHAT_ID: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Создаём экземпляр настроек
settings = Settings()