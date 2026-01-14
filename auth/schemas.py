"""
Pydantic схемы для авторизации и пользователей
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict
from datetime import datetime
from models import UserRole


# Базовая схема пользователя
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    full_name: str = Field(..., min_length=3, max_length=200)
    role: UserRole = UserRole.VIEWER


# Создание пользователя
class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)
    permissions: Optional[Dict[str, bool]] = None


# Обновление пользователя
class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=3, max_length=200)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)
    permissions: Optional[Dict[str, bool]] = None


# Ответ с данными пользователя
class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    permissions: Optional[Dict[str, bool]] = None
    
    class Config:
        from_attributes = True


# Схема для логина
class LoginRequest(BaseModel):
    username: str
    password: str


# Ответ с токеном
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Данные из токена
class TokenData(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None
    role: Optional[UserRole] = None
