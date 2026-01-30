"""
Pydantic схемы для пропусков
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime
from models import PropuskStatus, HistoryAction


# ============= ПРОПУСКА =============

class PropuskBase(BaseModel):
    gos_id: str = Field(..., min_length=1, max_length=20, description="Гос. номер")
    id_mark_auto: int
    id_model_auto: int
    id_org: int
    pass_type: str = Field(default="drive", max_length=20)
    release_date: date
    valid_until: date
    id_fio: int
    info: Optional[str] = Field(None, max_length=1000)
    
    @validator('valid_until')
    def validate_dates(cls, v, values):
        if 'release_date' in values and v < values['release_date']:
            raise ValueError('Дата окончания должна быть позже даты выпуска')
        return v


class PropuskCreate(PropuskBase):
    pass


class PropuskUpdate(BaseModel):
    gos_id: Optional[str] = Field(None, min_length=1, max_length=20)
    id_mark_auto: Optional[int] = None
    id_model_auto: Optional[int] = None
    id_org: Optional[int] = None
    pass_type: Optional[str] = Field(None, max_length=20)
    release_date: Optional[date] = None
    valid_until: Optional[date] = None
    id_fio: Optional[int] = None
    info: Optional[str] = Field(None, max_length=1000)


class PropuskResponse(PropuskBase):
    id_propusk: int
    status: PropuskStatus
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Расширенная информация
    mark_name: Optional[str] = None
    model_name: Optional[str] = None
    org_name: Optional[str] = None
    abonent_fio: Optional[str] = None
    creator_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class PropuskListResponse(BaseModel):
    items: List[PropuskResponse]
    total: int
    skip: int
    limit: int


class PropuskStatsResponse(BaseModel):
    active: int
    draft: int
    revoked: int
    pending_delete: int
    total: int


# ============= ИСТОРИЯ ИЗМЕНЕНИЙ =============

class PropuskHistoryResponse(BaseModel):
    id: int
    id_propusk: int
    action: HistoryAction
    changed_by: int
    user_name: Optional[str] = None
    old_values: Optional[str] = None
    new_values: Optional[str] = None
    comment: Optional[str] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True


# ============= ФИЛЬТРЫ ДЛЯ ПОИСКА =============

class PropuskFilters(BaseModel):
    status: Optional[PropuskStatus] = None
    id_org: Optional[int] = None
    gos_id: Optional[str] = None
    id_fio: Optional[int] = None
    created_by: Optional[int] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    search: Optional[str] = None  # Поиск по гос. номеру или ФИО


# ============= ИЗМЕНЕНИЕ СТАТУСА =============

class PropuskStatusChange(BaseModel):
    comment: Optional[str] = Field(None, max_length=500)
