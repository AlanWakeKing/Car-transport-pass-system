"""
Сервис авторизации и работы с пользователями
"""
from datetime import datetime, timedelta
import json
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models import User, UserRole
from config import settings
from auth.permissions import normalize_permissions, defaults_for_role


# Контекст для хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Сервис для работы с авторизацией"""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Проверка пароля"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Хеширование пароля"""
        return pwd_context.hash(password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Создание JWT токена"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> dict:
        """Декодирование JWT токена"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except JWTError as e:
            print(f"JWT Decode Error: {e}")  # Для отладки
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Невалидный токен",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    @staticmethod
    def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
        """Аутентификация пользователя"""
        user = db.query(User).filter(User.username == username).first()
        
        if not user:
            return None
        
        if not AuthService.verify_password(password, user.password_hash):
            return None
        
        if not user.is_active:
            return None
        
        return user
    
    @staticmethod
    def create_user(
        db: Session,
        username: str,
        password: str,
        full_name: str,
        role: UserRole,
        permissions=None,
        tg_user_id: Optional[int] = None
    ) -> User:
        """Создание нового пользователя"""
        # Проверяем, не существует ли уже пользователь
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким логином уже существует"
            )
        
        # Нормализуем права пользователя
        permissions_payload = normalize_permissions(permissions)
        if permissions_payload is None:
            role_value = role.value if hasattr(role, "value") else str(role)
            permissions_payload = defaults_for_role(role_value)

        # Создаём пользователя
        hashed_password = AuthService.get_password_hash(password)
        user = User(
            username=username,
            password_hash=hashed_password,
            full_name=full_name,
            role=role,
            is_active=True,
            extra_permissions=json.dumps(permissions_payload),
            tg_user_id=tg_user_id
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Получение пользователя по ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[User]:
        """Получение пользователя по username"""
        return db.query(User).filter(User.username == username).first()
