"""
API endpoints для пропусков
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from database import get_db
from models import User, PropuskStatus, Organiz
from propusk.schemas import (
    PropuskCreate, PropuskUpdate, PropuskResponse,
    PropuskStatusChange, PropuskHistoryResponse, PropuskListResponse, PropuskStatsResponse
)

from urllib.parse import quote

from propusk.service import PropuskService
from propusk.pdf_generator import PropuskPDFGenerator
from propusk.org_report import generate_org_report, generate_all_orgs_report
from settings.service import get_active_template, get_active_report_template
from auth.dependencies import (
    require_view, require_create, require_edit, require_delete, require_annul, require_mark_delete, require_activate,
    require_download_pdf, require_reports_access, get_user_permissions
)

def _get_allowed_statuses(user: User):
    role_value = user.role.value if hasattr(user.role, "value") else str(user.role)
    permissions = get_user_permissions(user) or {}

    if role_value == "viewer":
        return [PropuskStatus.ACTIVE]

    has_editing = any(permissions.get(key, False) for key in ["create", "edit", "delete"])
    if has_editing:
        return None

    has_activate = permissions.get("activate", False)
    has_annul = permissions.get("annul", False)
    has_mark_delete = permissions.get("mark_delete", False)

    if has_activate:
        return [PropuskStatus.ACTIVE, PropuskStatus.DRAFT]
    if has_annul or has_mark_delete:
        return [PropuskStatus.ACTIVE]

    if permissions.get("view", False):
        return [PropuskStatus.ACTIVE]
    return None


router = APIRouter(prefix="/api/propusk", tags=["Пропуска"])


@router.post("", response_model=PropuskResponse, status_code=status.HTTP_201_CREATED)
def create_propusk(
    propusk_data: PropuskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_create)
):
    """
    Создание нового пропуска в статусе "Черновик"
    Доступно по праву создания
    """
    propusk = PropuskService.create_propusk(
        db=db,
        propusk_data=propusk_data.dict(),
        created_by=current_user.id
    )
    
    # Добавляем расширенную информацию
    propusk = _enrich_propusk(db, propusk)
    return propusk


@router.get("", response_model=List[PropuskResponse])
def get_propusks(
    status: Optional[PropuskStatus] = Query(None, description="Фильтр по статусу"),
    id_org: Optional[int] = Query(None, description="Фильтр по организации"),
    gos_id: Optional[str] = Query(None, description="Поиск по гос. номеру"),
    id_fio: Optional[int] = Query(None, description="Фильтр по владельцу"),
    created_by: Optional[int] = Query(None, description="Фильтр по создателю"),
    date_from: Optional[date] = Query(None, description="Дата выпуска от"),
    date_to: Optional[date] = Query(None, description="Дата действия до"),
    search: Optional[str] = Query(None, description="Поиск по номеру или ФИО"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_view)
):
    """
    Получение списка пропусков с фильтрацией
    Охранник видит только активные пропуска
    """
    allowed_statuses = _get_allowed_statuses(current_user)
    if allowed_statuses:
        if status and status not in allowed_statuses:
            return []
        status = status or allowed_statuses

    propusks = PropuskService.get_propusks(
        db=db,
        status=status,
        id_org=id_org,
        gos_id=gos_id,
        id_fio=id_fio,
        created_by=created_by,
        date_from=date_from,
        date_to=date_to,
        search=search,
        skip=skip,
        limit=limit
    )
    
    # Обогащаем данными
    result = [_enrich_propusk(db, p) for p in propusks]
    return result


@router.get("/stats", response_model=PropuskStatsResponse)
def get_propusk_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_view)
):
    allowed_statuses = _get_allowed_statuses(current_user)
    counts = PropuskService.count_by_status(db, allowed_statuses=allowed_statuses)
    active = counts.get(PropuskStatus.ACTIVE.value, 0)
    draft = counts.get(PropuskStatus.DRAFT.value, 0)
    revoked = counts.get(PropuskStatus.REVOKED.value, 0)
    pending_delete = counts.get(PropuskStatus.PENDING_DELETE.value, 0)
    total = active + draft + revoked + pending_delete
    return {
        "active": active,
        "draft": draft,
        "revoked": revoked,
        "pending_delete": pending_delete,
        "total": total
    }


@router.get("/paged", response_model=PropuskListResponse)
def get_propusks_paged(
    status: Optional[PropuskStatus] = Query(None, description="Фильтр по статусу"),
    id_org: Optional[int] = Query(None, description="Фильтр по организации"),
    gos_id: Optional[str] = Query(None, description="Поиск по гос. номеру"),
    id_fio: Optional[int] = Query(None, description="Фильтр по владельцу"),
    created_by: Optional[int] = Query(None, description="Фильтр по создателю"),
    date_from: Optional[date] = Query(None, description="Дата выпуска от"),
    date_to: Optional[date] = Query(None, description="Дата действия до"),
    search: Optional[str] = Query(None, description="Поиск по номеру или ФИО"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_view)
):
    allowed_statuses = _get_allowed_statuses(current_user)
    if allowed_statuses:
        if status and status not in allowed_statuses:
            return {"items": [], "total": 0, "skip": skip, "limit": limit}
        status = status or allowed_statuses

    total = PropuskService.count_propusks(
        db=db,
        status=status,
        id_org=id_org,
        gos_id=gos_id,
        id_fio=id_fio,
        created_by=created_by,
        date_from=date_from,
        date_to=date_to,
        search=search
    )
    propusks = PropuskService.get_propusks(
        db=db,
        status=status,
        id_org=id_org,
        gos_id=gos_id,
        id_fio=id_fio,
        created_by=created_by,
        date_from=date_from,
        date_to=date_to,
        search=search,
        skip=skip,
        limit=limit
    )
    items = [_enrich_propusk(db, p) for p in propusks]
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/{propusk_id}", response_model=PropuskResponse)
def get_propusk(
    propusk_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_view)
):
    """Получение пропуска по ID"""
    propusk = PropuskService.get_propusk_by_id(db, propusk_id)
    
    if not propusk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пропуск не найден"
        )
    allowed_statuses = _get_allowed_statuses(current_user)
    if allowed_statuses and propusk.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пропуск не найден"
        )
    
    propusk = _enrich_propusk(db, propusk)
    return propusk


@router.patch("/{propusk_id}", response_model=PropuskResponse)
def update_propusk(
    propusk_id: int,
    propusk_data: PropuskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_edit)
):
    """
    Обновление пропуска
    Доступно по праву редактирования пропуска
    """
    update_data = propusk_data.dict(exclude_unset=True)
    
    propusk = PropuskService.update_propusk(
        db=db,
        propusk_id=propusk_id,
        update_data=update_data,
        user_id=current_user.id
    )
    
    propusk = _enrich_propusk(db, propusk)
    return propusk


@router.post("/{propusk_id}/activate", response_model=PropuskResponse)
def activate_propusk(
    propusk_id: int,
    data: PropuskStatusChange = PropuskStatusChange(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_activate)
):
    """
    Активация пропуска (Черновик → Активный)
    Доступно по праву активации
    """
    propusk = PropuskService.activate_propusk(
        db=db,
        propusk_id=propusk_id,
        user_id=current_user.id,
        comment=data.comment
    )
    
    propusk = _enrich_propusk(db, propusk)
    return propusk
@router.post("/{propusk_id}/restore", response_model=PropuskResponse)
def restore_propusk(
    propusk_id: int,
    data: PropuskStatusChange = PropuskStatusChange(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_annul)
):
    """
    Восстановление архивированного пропуска из архива (Архив → Отозван)
    Доступно только для: admin
    """
    propusk = PropuskService.restore_propusk(
        db=db,
        propusk_id=propusk_id,
        user_id=current_user.id,
        comment=data.comment
    )
    
    propusk = _enrich_propusk(db, propusk)
    return propusk

@router.post("/{propusk_id}/mark-delete", response_model=PropuskResponse)
def mark_for_deletion(
    propusk_id: int,
    data: PropuskStatusChange = PropuskStatusChange(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mark_delete)
):
    """
    Пометка на удаление (Активный → На удалении)
    Доступно по праву пометки на удаление
    """
    propusk = PropuskService.mark_for_deletion(
        db=db,
        propusk_id=propusk_id,
        user_id=current_user.id,
        comment=data.comment
    )
    
    propusk = _enrich_propusk(db, propusk)
    return propusk


@router.post("/{propusk_id}/revoke", response_model=PropuskResponse)
def revoke_propusk(
    propusk_id: int,
    data: PropuskStatusChange = PropuskStatusChange(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_annul)
):
    """
    Отзыв пропуска (Активный → Отозван)
    Доступно по праву аннулирования
    """
    propusk = PropuskService.revoke_propusk(
        db=db,
        propusk_id=propusk_id,
        user_id=current_user.id,
        comment=data.comment
    )
    
    propusk = _enrich_propusk(db, propusk)
    return propusk


@router.delete("/{propusk_id}/archive")
def archive_propusk(
    propusk_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_delete)
):
    """
    Архивирование отозванного пропуска
    Доступно только для: admin
    """
    result = PropuskService.archive_propusk(
        db=db,
        propusk_id=propusk_id,
        user_id=current_user.id
    )
    return result


@router.get("/{propusk_id}/history", response_model=List[PropuskHistoryResponse])
def get_propusk_history(
    propusk_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_view)
):
    """
    Получение истории изменений пропуска
    """
    # Проверяем существование пропуска
    propusk = PropuskService.get_propusk_by_id(db, propusk_id)
    if not propusk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пропуск не найден"
        )
    allowed_statuses = _get_allowed_statuses(current_user)
    if allowed_statuses and propusk.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пропуск не найден"
        )
    
    history = PropuskService.get_propusk_history(db, propusk_id)
    
    # Добавляем имя пользователя
    result = []
    for h in history:
        h_dict = PropuskHistoryResponse.from_orm(h)
        if h.user:
            h_dict.user_name = h.user.full_name
        result.append(h_dict)
    
    return result


@router.get("/{propusk_id}/pdf")
def download_propusk_pdf(
    propusk_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_download_pdf)
):
    propusk = PropuskService.get_propusk_by_id(db, propusk_id)
    
    if not propusk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пропуск не найден"
        )
    
    if propusk.status != PropuskStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Нельзя печатать пропуск в статусе '{propusk.status.value}'. Только активные пропуска можно печатать."
        )
    
    template = get_active_template(db)
    template_data = template.data_json if template else None
    pdf_buffer = PropuskPDFGenerator.generate_propusk_pdf(propusk, template_data=template_data)

    # корректный UTF-8 filename
    raw_filename = PropuskPDFGenerator.get_filename(propusk)
    encoded_filename = quote(raw_filename)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f"attachment; filename*=UTF-8''{encoded_filename}"
            )
        }
    )


@router.post("/pdf/batch")
def download_multiple_propusks_pdf(
    propusk_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_download_pdf)
):
    """
    Скачать PDF для нескольких пропусков (на одном листе A4)
    """
    if not propusk_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Список пропусков пуст"
        )
    
    if len(propusk_ids) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Максимум 50 пропусков за раз"
        )
    
    # Получаем пропуска
    propusks = []
    for pid in propusk_ids:
        propusk = PropuskService.get_propusk_by_id(db, pid)
        if propusk and propusk.status == PropuskStatus.ACTIVE:
            propusks.append(propusk)
    
    if not propusks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нет активных пропусков для печати"
        )
    
    # Генерируем PDF
    template = get_active_template(db)
    template_data = template.data_json if template else None
    pdf_buffer = PropuskPDFGenerator.generate_multiple_propusks_pdf(propusks, template_data=template_data)
    
    # Имя файла
    from datetime import datetime
    filename = f"propuski_batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/reports/org/all/pdf")
def download_all_orgs_report_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reports_access)
):
    """
    Отчёт по пропускам всех организаций (табличный вид).
    """
    orgs = db.query(Organiz).order_by(Organiz.org_name).all()
    items = []
    for org in orgs:
        propusks = PropuskService.get_propusks(
            db=db,
            id_org=org.id_org,
            status=PropuskStatus.ACTIVE,
            limit=1000
        )
        for p in propusks:
            _enrich_propusk(db, p)
        if not propusks:
            continue
        items.append(
            {
                "org_name": org.org_name,
                "free_mesto": org.free_mesto_limit if org.free_mesto_limit is not None else (org.free_mesto or 0),
                "permanent_count": len(propusks),
                "propusks": propusks
            }
        )

    report_template = get_active_report_template(db)
    template_data = report_template.data_json if report_template else None
    pdf_buffer = generate_all_orgs_report(items, template_data=template_data)
    filename = "orgs_report.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/reports/org/{org_id}/pdf")
def download_org_report_pdf(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reports_access)
):
    """
    Отчёт по пропускам организации (табличный вид).
    """
    org = db.query(Organiz).filter(Organiz.id_org == org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Организация не найдена")

    propusks = PropuskService.get_propusks(
        db=db,
        id_org=org_id,
        status=PropuskStatus.ACTIVE,
        limit=1000
    )

    for p in propusks:
        _enrich_propusk(db, p)

    report_template = get_active_report_template(db)
    template_data = report_template.data_json if report_template else None
    pdf_buffer = generate_org_report(
        org_name=org.org_name,
        free_mesto=org.free_mesto_limit if org.free_mesto_limit is not None else (org.free_mesto or 0),
        permanent_count=len(propusks),
        propusks=propusks,
        template_data=template_data
    )
    filename = f"org_{org_id}_report.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


def _enrich_propusk(db: Session, propusk) -> PropuskResponse:
    """
    Добавление расширенной информации к пропуску
    """
    # Марка
    if propusk.mark:
        propusk.mark_name = propusk.mark.mark_name
    
    # Модель
    if propusk.model:
        propusk.model_name = propusk.model.model_name
    
    # Организация
    if propusk.organization:
        propusk.org_name = propusk.organization.org_name
    
    # Абонент
    if propusk.abonent:
        propusk.abonent_fio = propusk.abonent.full_name
    
    # Создатель
    if propusk.creator:
        propusk.creator_name = propusk.creator.full_name
    
    return propusk
