"""
API endpoints для пропусков
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from database import get_db
from models import User, UserRole, PropuskStatus
from propusk.schemas import (
    PropuskCreate, PropuskUpdate, PropuskResponse, 
    PropuskStatusChange, PropuskHistoryResponse
)

from urllib.parse import quote

from propusk.service import PropuskService
from propusk.pdf_generator import PropuskPDFGenerator
from auth.dependencies import (
    get_current_active_user, require_admin, 
    require_manager_controller, require_manager
)


router = APIRouter(prefix="/api/propusk", tags=["Пропуска"])


@router.post("", response_model=PropuskResponse, status_code=status.HTTP_201_CREATED)
def create_propusk(
    propusk_data: PropuskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    """
    Создание нового пропуска в статусе "Черновик"
    Доступно для: admin, manager_creator, manager_controller
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
    current_user: User = Depends(get_current_active_user)
):
    """
    Получение списка пропусков с фильтрацией
    Охранник видит только активные пропуска
    """
    # Для охранника показываем только активные
    if current_user.role == UserRole.GUARD:
        status = PropuskStatus.ACTIVE
    
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


@router.get("/{propusk_id}", response_model=PropuskResponse)
def get_propusk(
    propusk_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение пропуска по ID"""
    propusk = PropuskService.get_propusk_by_id(db, propusk_id)
    
    if not propusk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пропуск не найден"
        )
    
    # Охранник может видеть только активные
    if current_user.role == UserRole.GUARD and propusk.status != PropuskStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещён"
        )
    
    propusk = _enrich_propusk(db, propusk)
    return propusk


@router.patch("/{propusk_id}", response_model=PropuskResponse)
def update_propusk(
    propusk_id: int,
    propusk_data: PropuskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    """
    Обновление пропуска
    Доступно для: admin, manager_creator, manager_controller
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
    current_user: User = Depends(require_manager_controller)
):
    """
    Активация пропуска (Черновик → Активный)
    Доступно только для: admin, manager_controller
    """
    propusk = PropuskService.activate_propusk(
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
    current_user: User = Depends(require_admin)
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


# ===== ДОБАВИТЬ НОВУЮ ФУНКЦИЮ НИЖЕ =====
@router.post("/{propusk_id}/restore", response_model=PropuskResponse)
def restore_propusk(
    propusk_id: int,
    data: PropuskStatusChange = PropuskStatusChange(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
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
    current_user: User = Depends(get_current_active_user)
):
    """
    Пометка на удаление (Активный → На удалении)
    Доступно для: admin, manager_creator, manager_controller, operator
    """
    if current_user.role == UserRole.GUARD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав"
        )
    
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
    current_user: User = Depends(require_manager_controller)
):
    """
    Отзыв пропуска (Активный → Отозван)
    Доступно только для: admin, manager_controller
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
    current_user: User = Depends(require_admin)
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
    current_user: User = Depends(get_current_active_user)
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
    current_user: User = Depends(get_current_active_user)
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
    
    pdf_buffer = PropuskPDFGenerator.generate_propusk_pdf(propusk)

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
    current_user: User = Depends(get_current_active_user)
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
    pdf_buffer = PropuskPDFGenerator.generate_multiple_propusks_pdf(propusks)
    
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