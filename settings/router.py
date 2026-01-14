import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, PropuskTemplate
from auth.dependencies import require_admin
from settings.schemas import PropuskTemplatePayload, PropuskTemplateResponse
from settings.service import (
    get_active_template,
    list_recent_templates,
    save_template,
    get_active_report_template,
    list_recent_report_templates,
    save_report_template,
)


router = APIRouter(prefix="/api/settings", tags=["Settings"])


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
