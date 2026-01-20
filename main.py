"""
Главный файл приложения FastAPI
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from contextlib import asynccontextmanager
import os

from config import settings
from database import check_connection, SessionLocal
from auth.router import router as auth_router
from references.router import router as references_router
from settings.router import router as settings_router
from settings.service import get_api_enabled, get_docs_enabled


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
    lifespan=lifespan,
)

# CORS (для фронтенда)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CSRF protection for cookie-based auth
_CSRF_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
_CSRF_EXEMPT_PATHS = {
    "/api/auth/login",
    "/api/auth/login-json",
    "/api/auth/login-telegram",
}
_API_TOGGLE_EXEMPT_PATHS = {
    "/api/auth/login",
    "/api/auth/login-json",
    "/api/auth/login-telegram",
    "/api/auth/logout",
    "/api/auth/me",
    "/api/settings/api-enabled",
    "/api/settings/docs-enabled",
}

_DOCS_PATHS = {"/docs", "/redoc", "/openapi.json"}


@app.middleware("http")
async def csrf_protect(request: Request, call_next):
    if request.url.path in _DOCS_PATHS:
        db = SessionLocal()
        try:
            if not get_docs_enabled(db):
                return JSONResponse(
                    status_code=status.HTTP_404_NOT_FOUND,
                    content={"detail": "Not found"},
                )
        finally:
            db.close()
    if request.url.path.startswith("/api") and request.url.path not in _API_TOGGLE_EXEMPT_PATHS:
        db = SessionLocal()
        try:
            if not get_api_enabled(db):
                return JSONResponse(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    content={"detail": "API disabled by administrator"},
                )
        finally:
            db.close()
    if request.method in _CSRF_METHODS:
        access_cookie = request.cookies.get("access_token")
        has_auth_header = request.headers.get("authorization")
        if access_cookie and not has_auth_header:
            if request.url.path not in _CSRF_EXEMPT_PATHS:
                csrf_header = request.headers.get(settings.CSRF_HEADER_NAME)
                csrf_cookie = request.cookies.get(settings.CSRF_COOKIE_NAME)
                if not csrf_header or not csrf_cookie or csrf_header != csrf_cookie:
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={"detail": "CSRF validation failed"},
                    )
    return await call_next(request)


# Подключение роутеров API
app.include_router(auth_router)
app.include_router(references_router)
app.include_router(settings_router)

# Импортируем роутер пропусков
from propusk.router import router as propusk_router
app.include_router(propusk_router)


# Монтирование статических файлов фронтенда
frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")


class UTF8StaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            lower_path = path.lower()
            if lower_path.endswith((".js", ".css", ".html")):
                content_type = response.headers.get("content-type", "")
                if "charset=" in content_type:
                    base_type = content_type.split(";", 1)[0]
                    response.headers["content-type"] = f"{base_type}; charset=utf-8"
                elif content_type:
                    response.headers["content-type"] = f"{content_type}; charset=utf-8"
                else:
                    response.headers["content-type"] = "text/plain; charset=utf-8"
        return response

# Монтируем CSS
css_dir = os.path.join(frontend_dir, "css")
if os.path.exists(css_dir):
    app.mount("/css", UTF8StaticFiles(directory=css_dir), name="css")

# Монтируем JS
js_dir = os.path.join(frontend_dir, "js")
if os.path.exists(js_dir):
    app.mount("/js", UTF8StaticFiles(directory=js_dir), name="js")


# Корневой endpoint - отдаём главную страницу фронтенда
@app.get("/")
def root():
    """
    Главная страница - веб-интерфейс системы управления пропусками
    """
    frontend_path = os.path.join(frontend_dir, "index.html")
    
    if os.path.exists(frontend_path):
        return FileResponse(frontend_path, media_type="text/html; charset=utf-8")
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


# Telegram mini-web app (auth)
@app.get("/telegram-auth")
def telegram_auth():
    frontend_path = os.path.join(frontend_dir, "telegram-auth.html")
    if os.path.exists(frontend_path):
        return FileResponse(frontend_path, media_type="text/html; charset=utf-8")
    return {
        "error": "not_found",
        "message": "telegram-auth.html not found in frontend directory"
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
