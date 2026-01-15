"""
API endpoints для авторизации и управления пользователями
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
import json

from database import get_db
from models import User, UserRole
from auth.schemas import UserCreate, UserResponse, UserUpdate, Token, LoginRequest, TelegramLoginRequest
from auth.service import AuthService
from auth.permissions import normalize_permissions, defaults_for_role
from auth.dependencies import get_current_active_user, require_admin


router = APIRouter(prefix="/api/auth", tags=["Авторизация"])


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
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
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login-json", response_model=Token)
def login_json(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
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
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login-telegram", response_model=Token)
def login_telegram(
    payload: TelegramLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Вход в систему через Telegram (по tg_user_id)
    """
    user = db.query(User).filter(User.tg_user_id == payload.tg_user_id).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден или неактивен"
        )

    access_token = AuthService.create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role.value}
    )

    return {"access_token": access_token, "token_type": "bearer"}


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
