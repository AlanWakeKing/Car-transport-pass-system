"""
Главный файл приложения FastAPI
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os

from config import settings
from database import check_connection
from auth.router import router as auth_router
from references.router import router as references_router


# Lifespan для инициализации при старте
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("\n" + "="*60)
    print(f"   {settings.APP_NAME} v{settings.APP_VERSION}")
    print("="*60)
    print("\n🔌 Проверка подключения к базе данных...")
    
    if check_connection():
        print("✅ База данных подключена успешно!")
    else:
        print("❌ ОШИБКА: Не удалось подключиться к базе данных!")
    
    print(f"\n📚 API Документация: http://localhost:8000/docs")
    print(f"🌐 Веб-интерфейс: http://localhost:8000/")
    print("="*60 + "\n")
    
    yield
    
    # Shutdown
    print("\n👋 Завершение работы приложения...")


# Создание приложения
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API для управления автомобильными пропусками",
    lifespan=lifespan
)

# CORS (для фронтенда)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В production указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Подключение роутеров API
app.include_router(auth_router)
app.include_router(references_router)

# Импортируем роутер пропусков
from propusk.router import router as propusk_router
app.include_router(propusk_router)


# Монтирование статических файлов фронтенда
frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")

# Монтируем CSS
css_dir = os.path.join(frontend_dir, "css")
if os.path.exists(css_dir):
    app.mount("/css", StaticFiles(directory=css_dir), name="css")

# Монтируем JS
js_dir = os.path.join(frontend_dir, "js")
if os.path.exists(js_dir):
    app.mount("/js", StaticFiles(directory=js_dir), name="js")


# Корневой endpoint - отдаём главную страницу фронтенда
@app.get("/")
def root():
    """
    Главная страница - веб-интерфейс системы управления пропусками
    """
    frontend_path = os.path.join(frontend_dir, "index.html")
    
    if os.path.exists(frontend_path):
        return FileResponse(frontend_path)
    else:
        return {
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "running",
            "api_docs": "/docs",
            "message": "Фронтенд не найден. Создайте папку frontend/ со следующей структурой:",
            "required_structure": {
                "frontend/": {
                    "index.html": "Главный HTML файл",
                    "css/": ["main.css", "material.css", "animations.css"],
                    "js/": {
                        "config/": ["constants.js"],
                        "utils/": ["statusConfig.js", "permissions.js", "validators.js"],
                        "api/": ["client.js"],
                        "context/": ["AppContext.js"],
                        "components/": ["common/", "layout/", "auth/"],
                        "pages/": ["Dashboard/", "Propusks/", "References/", "Users/"],
                        "main.js": "Точка входа"
                    }
                }
            }
        }


# Health check
@app.get("/health")
def health_check():
    """
    Проверка здоровья приложения
    """
    db_status = check_connection()
    frontend_exists = os.path.exists(os.path.join(frontend_dir, "index.html"))
    
    return {
        "status": "healthy" if db_status else "unhealthy",
        "database": "connected" if db_status else "disconnected",
        "frontend": "available" if frontend_exists else "not found",
        "version": settings.APP_VERSION
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # Автоперезагрузка при изменении кода
    )