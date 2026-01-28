"""
API endpoints for temporary passes.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime
from sqlalchemy import or_, and_

from database import get_db
from models import User, TemporaryPass
from settings.service import get_active_temp_pass_template, get_active_temp_pass_report_template
from auth.dependencies import (
    require_view,
    require_temp_create,
    require_temp_delete,
    require_temp_download,
    get_user_permissions,
)
from temporary_pass.schemas import (
    TemporaryPassCreate,
    TemporaryPassResponse,
    TemporaryPassListResponse,
    TemporaryPassRevoke,
)
from temporary_pass.service import TemporaryPassService
from temporary_pass.pdf_generator import TemporaryPassPDFGenerator
from temporary_pass.report_generator import TemporaryPassReportGenerator


router = APIRouter(prefix="/api/temporary-pass", tags=["Временные пропуска"])


@router.post("", response_model=TemporaryPassResponse, status_code=status.HTTP_201_CREATED)
def create_temporary_pass(
    payload: TemporaryPassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_temp_create),
):
    temp_pass = TemporaryPassService.create_pass(
        db=db,
        payload=payload.dict(),
        created_by=current_user.id,
    )
    return _enrich_temp_pass(temp_pass)


@router.get("", response_model=TemporaryPassListResponse)
def list_temporary_passes(
    status_filter: Optional[str] = Query(None, description="active, expired, revoked"),
    id_org: Optional[int] = Query(None),
    gos_id: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_view),
):
    permissions = get_user_permissions(current_user)
    if not permissions.get("temp_view_all", False):
        status_filter = "active"
    items = TemporaryPassService.list_passes(
        db=db,
        status_filter=status_filter,
        id_org=id_org,
        gos_id=gos_id,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit,
    )
    total = TemporaryPassService.count_passes(
        db=db,
        status_filter=status_filter,
        id_org=id_org,
        gos_id=gos_id,
        date_from=date_from,
        date_to=date_to,
    )
    return {
        "items": [_enrich_temp_pass(item) for item in items],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/reports/all/pdf")
def download_all_temporary_passes_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_temp_download),
):
    now = TemporaryPassService._now()
    items = (
        db.query(TemporaryPass)
        .filter(
            or_(
                TemporaryPass.revoked_at.is_not(None),
                and_(
                    TemporaryPass.revoked_at.is_(None),
                    TemporaryPass.valid_from <= now,
                    TemporaryPass.valid_until > now,
                ),
            )
        )
        .order_by(TemporaryPass.created_at.desc())
        .all()
    )
    grouped = {}
    for item in items:
        org_name = item.organization.org_name if item.organization else "Без организации"
        grouped.setdefault(org_name, []).append(item)
    groups = [
        {"org_name": name, "items": grouped[name]}
        for name in sorted(grouped.keys())
    ]
    report_template = get_active_temp_pass_report_template(db)
    report_template_data = report_template.data_json if report_template else None
    pdf_buffer = TemporaryPassReportGenerator.generate_report(groups, template_data=report_template_data)
    filename = "temporary_passes_report.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{pass_id}", response_model=TemporaryPassResponse)
def get_temporary_pass(
    pass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_view),
):
    temp_pass = TemporaryPassService.get_pass(db, pass_id)
    if not temp_pass:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Временный пропуск не найден",
        )
    return _enrich_temp_pass(temp_pass)


@router.post("/{pass_id}/revoke", response_model=TemporaryPassResponse)
def revoke_temporary_pass(
    pass_id: int,
    payload: TemporaryPassRevoke = TemporaryPassRevoke(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_temp_delete),
):
    temp_pass = TemporaryPassService.revoke_pass(
        db=db,
        pass_id=pass_id,
        user_id=current_user.id,
        comment=payload.comment,
    )
    return _enrich_temp_pass(temp_pass)


@router.get("/{pass_id}/pdf")
def download_temporary_pass_pdf(
    pass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_temp_download),
):
    temp_pass = TemporaryPassService.get_pass(db, pass_id)
    if not temp_pass:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Временный пропуск не найден",
        )
    template = get_active_temp_pass_template(db)
    template_data = template.data_json if template else None
    pdf_buffer = TemporaryPassPDFGenerator.generate_pdf(temp_pass, template_data=template_data)
    filename = TemporaryPassPDFGenerator.get_filename(temp_pass)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )




@router.delete("/{pass_id}")
def delete_temporary_pass(
    pass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_temp_delete),
):
    TemporaryPassService.delete_pass(db, pass_id)
    return {"message": "Временный пропуск удалён"}


@router.post("/{pass_id}/enter", response_model=TemporaryPassResponse)
def mark_enter(
    pass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_temp_create),
):
    temp_pass = TemporaryPassService.mark_enter(db, pass_id, current_user.id)
    return _enrich_temp_pass(temp_pass)


@router.post("/{pass_id}/exit", response_model=TemporaryPassResponse)
def mark_exit(
    pass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_temp_create),
):
    temp_pass = TemporaryPassService.mark_exit(db, pass_id, current_user.id)
    return _enrich_temp_pass(temp_pass)


def _enrich_temp_pass(temp_pass) -> TemporaryPassResponse:
    if temp_pass.organization:
        temp_pass.org_name = temp_pass.organization.org_name
    if temp_pass.creator:
        temp_pass.creator_name = temp_pass.creator.full_name
    if getattr(temp_pass, "exiter", None):
        temp_pass.exited_by_name = temp_pass.exiter.full_name
    return temp_pass
