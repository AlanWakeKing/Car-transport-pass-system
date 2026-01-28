"""
Schemas for temporary passes.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TemporaryPassCreate(BaseModel):
    gos_id: str = Field(..., min_length=1, max_length=20)
    id_org: int
    phone: Optional[str] = Field(None, max_length=30)
    comment: Optional[str] = Field(None, max_length=1000)


class TemporaryPassRevoke(BaseModel):
    comment: Optional[str] = Field(None, max_length=500)


class TemporaryPassResponse(BaseModel):
    id: int
    gos_id: str
    id_org: int
    phone: Optional[str] = None
    comment: Optional[str] = None
    valid_from: datetime
    valid_until: datetime
    created_by: int
    created_at: datetime
    revoked_at: Optional[datetime] = None
    revoked_by: Optional[int] = None
    entered_at: Optional[datetime] = None
    exited_at: Optional[datetime] = None
    status: str

    org_name: Optional[str] = None
    creator_name: Optional[str] = None

    class Config:
        from_attributes = True


class TemporaryPassListResponse(BaseModel):
    items: List[TemporaryPassResponse]
    total: int
    skip: int
    limit: int
