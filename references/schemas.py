"""
Pydantic СЃС…РµРјС‹ РґР»СЏ СЃРїСЂР°РІРѕС‡РЅРёРєРѕРІ
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============= РћР Р“РђРќРР—РђР¦РР =============

class OrganizBase(BaseModel):
    org_name: str = Field(..., min_length=2, max_length=200)
    free_mesto: int = Field(default=0, ge=0)
    comment: Optional[str] = Field(None, max_length=500)


class OrganizCreate(OrganizBase):
    pass


class OrganizUpdate(BaseModel):
    org_name: Optional[str] = Field(None, min_length=2, max_length=200)
    free_mesto: Optional[int] = Field(None, ge=0)
    comment: Optional[str] = Field(None, max_length=500)


class OrganizResponse(OrganizBase):
    id_org: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============= РњРђР РљР РђР’РўРћРњРћР‘РР›Р•Р™ =============

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


# ============= РњРћР”Р•Р›Р РђР’РўРћРњРћР‘РР›Р•Р™ =============

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
    mark_name: Optional[str] = None  # Р”Р»СЏ СѓРґРѕР±СЃС‚РІР° Р±СѓРґРµРј РІРѕР·РІСЂР°С‰Р°С‚СЊ Рё РЅР°Р·РІР°РЅРёРµ РјР°СЂРєРё
    
    class Config:
        from_attributes = True


# ============= РђР‘РћРќР•РќРўР« (Р’Р›РђР”Р•Р›Р¬Р¦Р«) =============

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


class AbonentResponse(BaseModel):
    id_fio: int
    surname: str = Field(..., max_length=100)
    name: str = Field(..., max_length=100)
    otchestvo: Optional[str] = Field(None, max_length=100)
    id_org: int
    info: Optional[str] = Field(None, max_length=500)
    full_name: str
    org_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AbonentListResponse(BaseModel):
    items: List[AbonentResponse]
    total: int
    skip: int
    limit: int

