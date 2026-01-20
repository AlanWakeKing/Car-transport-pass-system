import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, PropuskTemplate
from auth.dependencies import require_admin
from settings.schemas import PropuskTemplatePayload, PropuskTemplateResponse, ApiTogglePayload, ApiToggleResponse, DocsTogglePayload, DocsToggleResponse
from settings.service import (
    get_active_template,
    list_recent_templates,
    save_template,
    get_active_report_template,
    list_recent_report_templates,
    save_report_template,
    get_api_enabled,
    set_api_enabled,
    get_docs_enabled,
    set_docs_enabled,
)


router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("/api-enabled", response_model=ApiToggleResponse)
def get_api_enabled_state(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return {"enabled": get_api_enabled(db)}


@router.put("/api-enabled", response_model=ApiToggleResponse)
def update_api_enabled_state(
    payload: ApiTogglePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    setting = set_api_enabled(db, payload.enabled)
    try:
        enabled = bool(json.loads(setting.value))
    except Exception:
        enabled = True
    return {"enabled": enabled}


@router.get("/docs-enabled", response_model=DocsToggleResponse)
def get_docs_enabled_state(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return {"enabled": get_docs_enabled(db)}


@router.put("/docs-enabled", response_model=DocsToggleResponse)
def update_docs_enabled_state(
    payload: DocsTogglePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    setting = set_docs_enabled(db, payload.enabled)
    try:
        enabled = bool(json.loads(setting.value))
    except Exception:
        enabled = True
    return {"enabled": enabled}


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
