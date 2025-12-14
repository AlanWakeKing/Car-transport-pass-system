"""
Pydantic схемы для справочников
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============= ОРГАНИЗАЦИИ =============

class OrganizBase(BaseModel):
    org_name: str = Field(..., min_length=2, max_length=200)
    free_mesto: int = Field(default=0, ge=0)


class OrganizCreate(OrganizBase):
    pass


class OrganizUpdate(BaseModel):
    org_name: Optional[str] = Field(None, min_length=2, max_length=200)
    free_mesto: Optional[int] = Field(None, ge=0)


class OrganizResponse(OrganizBase):
    id_org: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============= МАРКИ АВТОМОБИЛЕЙ =============

class MarkAutoBase(BaseModel):
    mark_name: str = Field(..., min_length=1, max_length=100)


class MarkAutoCreate(MarkAutoBase):
    pass


class MarkAutoUpdate(BaseModel):
    mark_name: Optional[str] = Field(None, min_length=1, max_length=100)


class MarkAutoResponse(MarkAutoBase):
    id_mark: int
    
    class Config:
        from_attributes = True


# ============= МОДЕЛИ АВТОМОБИЛЕЙ =============

class ModelAutoBase(BaseModel):
    id_mark: int
    model_name: str = Field(..., min_length=1, max_length=100)


class ModelAutoCreate(ModelAutoBase):
    pass


class ModelAutoUpdate(BaseModel):
    id_mark: Optional[int] = None
    model_name: Optional[str] = Field(None, min_length=1, max_length=100)


class ModelAutoResponse(ModelAutoBase):
    id_model: int
    mark_name: Optional[str] = None  # Для удобства будем возвращать и название марки
    
    class Config:
        from_attributes = True


# ============= АБОНЕНТЫ (ВЛАДЕЛЬЦЫ) =============

class AbonentBase(BaseModel):
    surname: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=100)
    otchestvo: Optional[str] = Field(None, max_length=100)
    id_org: int
    info: Optional[str] = Field(None, max_length=500)


class AbonentCreate(AbonentBase):
    pass


class AbonentUpdate(BaseModel):
    surname: Optional[str] = Field(None, min_length=1, max_length=100)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    otchestvo: Optional[str] = Field(None, max_length=100)
    id_org: Optional[int] = None
    info: Optional[str] = Field(None, max_length=500)


class AbonentResponse(AbonentBase):
    id_fio: int
    full_name: str  # Полное ФИО
    org_name: Optional[str] = None  # Название организации
    created_at: datetime
    
    class Config:
        from_attributes = True