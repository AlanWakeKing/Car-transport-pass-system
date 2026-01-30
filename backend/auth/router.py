"""
API endpoints для авторизации и управления пользователями
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from collections import deque
from threading import Lock
import time
from typing import List
import time
import hmac
import hashlib
import secrets
import json
from urllib import request as urllib_request
from urllib import error as urllib_error

from database import get_db
from config import settings
from models import User, UserRole
from auth.schemas import UserCreate, UserResponse, UserUpdate, Token, LoginRequest, TelegramLoginRequest, TelegramLinkRequest
from auth.service import AuthService
from auth.permissions import normalize_permissions, defaults_for_role
from auth.dependencies import get_current_active_user, require_admin


router = APIRouter(prefix="/api/auth", tags=["Авторизация"])

_rate_lock = Lock()
_rate_hits: dict[str, deque] = {}


def _sign_value(value: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        value.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _encode_last_active(timestamp: int) -> str:
    raw = str(timestamp)
    return f"{raw}.{_sign_value(raw)}"


def _set_auth_cookies(response: Response, access_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE
    )
    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE
    )
    response.set_cookie(
        key=settings.LAST_ACTIVE_COOKIE_NAME,
        value=_encode_last_active(int(time.time())),
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE
    )


def rate_limit(request: Request, limit: int = 10, window_seconds: int = 60):
    client = request.client.host if request.client else "unknown"
    key = f"{client}:{request.url.path}"
    now = time.time()
    with _rate_lock:
        bucket = _rate_hits.setdefault(key, deque())
        while bucket and now - bucket[0] > window_seconds:
            bucket.popleft()
        if len(bucket) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Слишком много попыток. Повторите позже."
            )
        bucket.append(now)


def send_telegram_welcome_message(user: User) -> None:
    bot_token = settings.TELEGRAM_BOT_TOKEN
    if not bot_token or not user.tg_user_id:
        return
    text = settings.TELEGRAM_WELCOME_MESSAGE or "Авторизация выполнена."
    payload = {
        "chat_id": user.tg_user_id,
        "text": text,
    }
    data = json.dumps(payload).encode("utf-8")
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    req = urllib_request.Request(
        url,
        data=data,
        headers={"content-type": "application/json"},
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=5):
            return
    except urllib_error.URLError as exc:
        print(f"Telegram sendMessage error: {exc}")


def send_n8n_welcome_webhook(user: User) -> None:
    webhook_url = settings.N8N_TG_WELCOME_WEBHOOK_URL
    if not webhook_url:
        return
    payload = {
        "event": "telegram_linked",
        "user_id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "tg_user_id": user.tg_user_id,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(
        webhook_url,
        data=data,
        headers={"content-type": "application/json"},
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=5):
            return
    except urllib_error.URLError as exc:
        print(f"N8N webhook error: {exc}")


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    response: Response = None,
    db: Session = Depends(get_db),
    _limit=Depends(rate_limit)
):
    """
    Вход в систему (получение JWT токена)
    """
    user = AuthService.authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Создаём токен
    access_token = AuthService.create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role.value}
    )

    if response is not None:
        _set_auth_cookies(response, access_token)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login-json", response_model=Token)
def login_json(
    credentials: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
    _limit=Depends(rate_limit)
):
    """
    Вход в систему через JSON (альтернативный вариант для фронтенда)
    """
    user = AuthService.authenticate_user(db, credentials.username, credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль"
        )
    
    access_token = AuthService.create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role.value}
    )

    _set_auth_cookies(response, access_token)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login-telegram", response_model=Token)
def login_telegram(
    payload: TelegramLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
    _limit=Depends(rate_limit)
):
    """
    Вход в систему через Telegram (по tg_user_id)
    """
    payload_dict = payload.dict(exclude_none=True)
    if not AuthService.verify_telegram_login(payload_dict):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидная подпись Telegram"
        )

    user = db.query(User).filter(User.tg_user_id == payload.id).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден или неактивен"
        )

    access_token = AuthService.create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role.value}
    )

    _set_auth_cookies(response, access_token)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
def logout(response: Response):
    """
    Выход из системы (очистка cookies)
    """
    response.delete_cookie(key="access_token")
    response.delete_cookie(key=settings.CSRF_COOKIE_NAME)
    response.delete_cookie(key=settings.LAST_ACTIVE_COOKIE_NAME)
    return {"message": "ok"}


@router.post("/link-telegram", response_model=UserResponse)
def link_telegram(
    payload: TelegramLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _limit=Depends(rate_limit)
):
    """
    Привязка Telegram ID к текущему пользователю
    """
    if payload.tg_user_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telegram ID должен быть положительным числом"
        )
    existing_user = (
        db.query(User)
        .filter(User.tg_user_id == payload.tg_user_id, User.id != current_user.id)
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Этот Telegram ID уже привязан к другому пользователю"
        )

    current_user.tg_user_id = payload.tg_user_id
    db.commit()
    db.refresh(current_user)
    send_telegram_welcome_message(current_user)
    send_n8n_welcome_webhook(current_user)
    return current_user


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Получение информации о текущем пользователе
    """
    return current_user


@router.post("/users", response_model=UserResponse)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Создание нового пользователя (только для администратора)
    """
    user = AuthService.create_user(
        db=db,
        username=user_data.username,
        password=user_data.password,
        full_name=user_data.full_name,
        role=user_data.role,
        permissions=user_data.permissions,
        tg_user_id=user_data.tg_user_id
    )
    return user


@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Получение списка всех пользователей (только для администратора)
    """
    users = db.query(User).all()
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Получение пользователя по ID (только для администратора)
    """
    user = AuthService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Обновление данных пользователя (только для администратора)
    """
    user = AuthService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Обновляем поля
    if user_data.full_name is not None:
        user.full_name = user_data.full_name
    
    if user_data.role is not None:
        user.role = user_data.role
    
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    if user_data.password is not None:
        user.password_hash = AuthService.get_password_hash(user_data.password)

    if user_data.tg_user_id is not None:
        user.tg_user_id = user_data.tg_user_id

    if user_data.permissions is not None:
        permissions_payload = normalize_permissions(user_data.permissions)
        if permissions_payload is None:
            role_value = user.role.value if hasattr(user.role, "value") else str(user.role)
            permissions_payload = defaults_for_role(role_value)
        user.extra_permissions = json.dumps(permissions_payload)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Удаление пользователя (только для администратора)
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалить самого себя"
        )
    
    user = AuthService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    db.delete(user)
    db.commit()
    return {"message": "Пользователь успешно удалён"}
