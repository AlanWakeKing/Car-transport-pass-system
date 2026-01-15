import json
from pathlib import Path
from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import User, PropuskTemplate
from auth.dependencies import require_admin
from settings.schemas import DbEnvSettings, PropuskTemplatePayload, PropuskTemplateResponse
from settings.service import (
    get_active_template,
    list_recent_templates,
    save_template,
    get_active_report_template,
    list_recent_report_templates,
    save_report_template,
)


router = APIRouter(prefix="/api/settings", tags=["Settings"])

ENV_FILE = Path(".env")
ENV_KEYS = {
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_HOST",
    "POSTGRES_PORT",
    "DATABASE_URL",
}


def _read_env_file() -> tuple[Dict[str, str], list[str]]:
    if not ENV_FILE.exists():
        return {}, []
    lines = ENV_FILE.read_text(encoding="utf-8").splitlines()
    data: Dict[str, str] = {}
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        key, sep, value = line.partition("=")
        if not sep:
            continue
        data[key.strip()] = value.strip()
    return data, lines


def _write_env_file(updates: Dict[str, str]) -> None:
    _, lines = _read_env_file()
    updates = {k: v for k, v in updates.items() if k in ENV_KEYS}
    found = set()
    new_lines: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in line:
            new_lines.append(line)
            continue
        key = line.split("=", 1)[0].strip()
        if key in updates:
            new_lines.append(f"{key}={updates[key]}")
            found.add(key)
        else:
            new_lines.append(line)
    for key, value in updates.items():
        if key not in found:
            new_lines.append(f"{key}={value}")
    content = "\n".join(new_lines).rstrip("\n") + "\n"
    ENV_FILE.write_text(content, encoding="utf-8")


def _get_env_value(data: Dict[str, str], key: str, fallback: str | None) -> str | None:
    if key in data:
        return data[key]
    return fallback


@router.get("/propusk-template/active", response_model=PropuskTemplateResponse)
def get_active_propusk_template(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    template = get_active_template(db)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    data = template.data_json if hasattr(template, "data_json") else json.loads(template.data or "{}")
    return {
        "id": template.id,
        "version": template.version,
        "data": data,
        "created_at": template.created_at,
        "created_by": template.created_by,
        "is_active": template.is_active,
    }


@router.get("/propusk-template/versions", response_model=list[PropuskTemplateResponse])
def list_propusk_template_versions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    templates = list_recent_templates(db, limit=2)
    result = []
    for template in templates:
        data = template.data_json if hasattr(template, "data_json") else json.loads(template.data or "{}")
        result.append(
            {
                "id": template.id,
                "version": template.version,
                "data": data,
                "created_at": template.created_at,
                "created_by": template.created_by,
                "is_active": template.is_active,
            }
        )
    return result


@router.post("/propusk-template", response_model=PropuskTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_propusk_template(
    payload: PropuskTemplatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    template = save_template(db, payload.data, current_user.id)
    data = template.data_json if hasattr(template, "data_json") else json.loads(template.data or "{}")
    return {
        "id": template.id,
        "version": template.version,
        "data": data,
        "created_at": template.created_at,
        "created_by": template.created_by,
        "is_active": template.is_active,
    }


@router.get("/report-template/active", response_model=PropuskTemplateResponse)
def get_active_report_template_view(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    template = get_active_report_template(db)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    data = template.data_json if hasattr(template, "data_json") else json.loads(template.data or "{}")
    return {
        "id": template.id,
        "version": template.version,
        "data": data,
        "created_at": template.created_at,
        "created_by": template.created_by,
        "is_active": template.is_active,
    }


@router.get("/report-template/versions", response_model=list[PropuskTemplateResponse])
def list_report_template_versions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    templates = list_recent_report_templates(db, limit=2)
    result = []
    for template in templates:
        data = template.data_json if hasattr(template, "data_json") else json.loads(template.data or "{}")
        result.append(
            {
                "id": template.id,
                "version": template.version,
                "data": data,
                "created_at": template.created_at,
                "created_by": template.created_by,
                "is_active": template.is_active,
            }
        )
    return result


@router.post("/report-template", response_model=PropuskTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_report_template(
    payload: PropuskTemplatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    template = save_report_template(db, payload.data, current_user.id)
    data = template.data_json if hasattr(template, "data_json") else json.loads(template.data or "{}")
    return {
        "id": template.id,
        "version": template.version,
        "data": data,
        "created_at": template.created_at,
        "created_by": template.created_by,
        "is_active": template.is_active,
    }


@router.get("/db-env", response_model=DbEnvSettings)
def get_db_env_settings(
    current_user: User = Depends(require_admin),
):
    data, _ = _read_env_file()
    return DbEnvSettings(
        POSTGRES_DB=_get_env_value(data, "POSTGRES_DB", settings.POSTGRES_DB),
        POSTGRES_USER=_get_env_value(data, "POSTGRES_USER", settings.POSTGRES_USER),
        POSTGRES_PASSWORD=_get_env_value(data, "POSTGRES_PASSWORD", settings.POSTGRES_PASSWORD),
        POSTGRES_HOST=_get_env_value(data, "POSTGRES_HOST", settings.POSTGRES_HOST),
        POSTGRES_PORT=_get_env_value(data, "POSTGRES_PORT", str(settings.POSTGRES_PORT)),
        DATABASE_URL=_get_env_value(data, "DATABASE_URL", settings.DATABASE_URL),
    )


@router.post("/db-env", response_model=DbEnvSettings)
def update_db_env_settings(
    payload: DbEnvSettings,
    current_user: User = Depends(require_admin),
):
    updates = payload.model_dump(exclude_none=True)
    cleaned: Dict[str, str] = {}
    for key, value in updates.items():
        if isinstance(value, str):
            cleaned[key] = value.replace("\r", "").replace("\n", "").strip()
        else:
            cleaned[key] = str(value)
    _write_env_file(cleaned)
    data, _ = _read_env_file()
    return DbEnvSettings(
        POSTGRES_DB=_get_env_value(data, "POSTGRES_DB", settings.POSTGRES_DB),
        POSTGRES_USER=_get_env_value(data, "POSTGRES_USER", settings.POSTGRES_USER),
        POSTGRES_PASSWORD=_get_env_value(data, "POSTGRES_PASSWORD", settings.POSTGRES_PASSWORD),
        POSTGRES_HOST=_get_env_value(data, "POSTGRES_HOST", settings.POSTGRES_HOST),
        POSTGRES_PORT=_get_env_value(data, "POSTGRES_PORT", str(settings.POSTGRES_PORT)),
        DATABASE_URL=_get_env_value(data, "DATABASE_URL", settings.DATABASE_URL),
    )
