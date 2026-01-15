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
from auth.permissions import PERMISSION_KEYS, normalize_permissions, defaults_for_role


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
    UserRole.MANAGER
])

# Все роли (любой авторизованный пользователь)
require_auth = get_current_active_user

# ===== Permissions =====
def get_user_permissions(user: User) -> dict:
    role_value = user.role.value if hasattr(user.role, 'value') else str(user.role)
    data = user.permissions if hasattr(user, 'permissions') else {}
    if data:
        normalized = normalize_permissions(data)
        if normalized is not None:
            role_defaults = defaults_for_role(role_value)
            role_defaults.update(normalized)
            return role_defaults
    return defaults_for_role(role_value)

def require_permissions(required):
    def checker(user: User = Depends(get_current_active_user)) -> User:
        permissions = get_user_permissions(user)
        missing = [p for p in required if not permissions.get(p, False)]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="???????????? ???? ??? ?????????? ????????"
            )
        return user
    return checker

require_view = require_permissions(["view"])
require_create = require_permissions(["create"])
require_edit = require_permissions(["edit"])
require_delete = require_permissions(["delete"])
require_annul = require_permissions(["annul"])
require_mark_delete = require_permissions(["mark_delete"])
require_activate = require_permissions(["activate"])
require_edit_organization = require_permissions(["edit_organization"])
require_download_pdf = require_permissions(["download_pdf"])


def require_reports_access(user: User = Depends(get_current_active_user)) -> User:
    permissions = get_user_permissions(user)
    if not (permissions.get("menu_reports", False) or permissions.get("download_pdf", False)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра отчетов"
        )
    return user
