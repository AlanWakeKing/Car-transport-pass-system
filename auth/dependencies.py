"""
Dependencies для проверки авторизации и прав доступа
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User, UserRole
from auth.service import AuthService


# OAuth2 схема для токенов
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Получение текущего пользователя из токена
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось валидировать учётные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = AuthService.decode_token(token)
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)  # Конвертируем строку в число
    except Exception:
        raise credentials_exception
    
    user = AuthService.get_user_by_id(db, user_id=user_id)
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь заблокирован"
        )
    
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Проверка, что пользователь активен
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь неактивен"
        )
    return current_user


class RoleChecker:
    """
    Класс для проверки роли пользователя
    Использование: Depends(RoleChecker([UserRole.ADMIN]))
    """
    
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles
    
    def __call__(self, user: User = Depends(get_current_active_user)) -> User:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для выполнения этой операции"
            )
        return user


# Предустановленные проверки ролей
require_admin = RoleChecker([UserRole.ADMIN])

require_manager = RoleChecker([
    UserRole.ADMIN,
    UserRole.MANAGER_CREATOR,
    UserRole.MANAGER_CONTROLLER
])

require_manager_controller = RoleChecker([
    UserRole.ADMIN,
    UserRole.MANAGER_CONTROLLER
])

require_operator = RoleChecker([
    UserRole.ADMIN,
    UserRole.MANAGER_CREATOR,
    UserRole.MANAGER_CONTROLLER,
    UserRole.OPERATOR
])

# Все роли (любой авторизованный пользователь)
require_auth = get_current_active_user