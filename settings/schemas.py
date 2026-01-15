from datetime import datetime
from typing import Dict, Any

from pydantic import BaseModel


class PropuskTemplatePayload(BaseModel):
    data: Dict[str, Any]


class PropuskTemplateResponse(BaseModel):
    id: int
    version: int
    data: Dict[str, Any]
    created_at: datetime
    created_by: int
    is_active: bool

    class Config:
        from_attributes = True


class DbEnvSettings(BaseModel):
    POSTGRES_DB: str | None = None
    POSTGRES_USER: str | None = None
    POSTGRES_PASSWORD: str | None = None
    POSTGRES_HOST: str | None = None
    POSTGRES_PORT: str | None = None
    DATABASE_URL: str | None = None
