"""
Конфигурация подключения к базе данных PostgreSQL
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

from config import settings

# Параметры подключения к PostgreSQL
# Измени эти параметры под свою БД
DATABASE_URL = settings.DATABASE_URL

# Создание движка БД
engine = create_engine(
    DATABASE_URL,
    echo=settings.DEBUG,  # Показывать SQL запросы в консоли (для отладки)
    pool_pre_ping=True  # Проверка соединения перед использованием
)

# Создание фабрики сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс для моделей
Base = declarative_base()

# Функция для получения сессии БД
def get_db():
    """
    Генератор сессии базы данных
    Используется в FastAPI для dependency injection
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Функция для проверки подключения
def check_connection():
    """
    Проверка подключения к базе данных
    """
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))  # Используем text() для SQLAlchemy 2.0
        db.close()
        print("✅ Подключение к базе данных успешно!")
        return True
    except Exception as e:
        print(f"❌ Ошибка подключения к базе данных: {e}")
        return False
