"""
API endpoints для справочников
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from database import get_db
from models import Organiz, MarkAuto, ModelAuto, Abonent, User
from references.schemas import (
    OrganizCreate, OrganizUpdate, OrganizResponse,
    MarkAutoCreate, MarkAutoUpdate, MarkAutoResponse,
    ModelAutoCreate, ModelAutoUpdate, ModelAutoResponse,
    AbonentCreate, AbonentUpdate, AbonentResponse, AbonentListResponse
)
from auth.dependencies import require_auth, require_admin, require_edit_organization


router = APIRouter(prefix="/api/references", tags=["Справочники"])


# ============= ОРГАНИЗАЦИИ =============

@router.get("/organizations", response_model=List[OrganizResponse])
def get_organizations(
    search: Optional[str] = Query(None, description="Поиск по названию"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """Получение списка организаций"""
    query = db.query(Organiz)
    
    if search:
        query = query.filter(Organiz.org_name.ilike(f"%{search}%"))
    
    return query.order_by(Organiz.org_name).all()


@router.post("/organizations", response_model=OrganizResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    org_data: OrganizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_edit_organization)
):
    """Создание новой организации (только админ)"""
    # Проверяем уникальность названия
    existing = db.query(Organiz).filter(Organiz.org_name == org_data.org_name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Организация с таким названием уже существует"
        )
    
    organization = Organiz(**org_data.dict())
    db.add(organization)
    db.commit()
    db.refresh(organization)
    return organization


@router.get("/organizations/{org_id}", response_model=OrganizResponse)
def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """Получение организации по ID"""
    org = db.query(Organiz).filter(Organiz.id_org == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Организация не найдена"
        )
    return org


@router.patch("/organizations/{org_id}", response_model=OrganizResponse)
def update_organization(
    org_id: int,
    org_data: OrganizUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_edit_organization)
):
    """Обновление организации (только админ)"""
    org = db.query(Organiz).filter(Organiz.id_org == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Организация не найдена"
        )
    
    update_data = org_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(org, field, value)
    
    db.commit()
    db.refresh(org)
    return org


@router.delete("/organizations/{org_id}")
def delete_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_edit_organization)
):
    """Удаление организации (только админ)"""
    org = db.query(Organiz).filter(Organiz.id_org == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Организация не найдена"
        )
    
    # Проверяем, нет ли связанных абонентов или пропусков
    if org.abonents or org.propusks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Невозможно удалить организацию с привязанными данными"
        )
    
    db.delete(org)
    db.commit()
    return {"message": "Организация успешно удалена"}


# ============= МАРКИ АВТОМОБИЛЕЙ =============

@router.get("/marks", response_model=List[MarkAutoResponse])
def get_marks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """Получение списка марок автомобилей"""
    return db.query(MarkAuto).order_by(MarkAuto.mark_name).all()


@router.post("/marks", response_model=MarkAutoResponse, status_code=status.HTTP_201_CREATED)
def create_mark(
    mark_data: MarkAutoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Создание новой марки (только админ)"""
    existing = db.query(MarkAuto).filter(MarkAuto.mark_name == mark_data.mark_name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Марка с таким названием уже существует"
        )
    
    mark = MarkAuto(**mark_data.dict())
    db.add(mark)
    db.commit()
    db.refresh(mark)
    return mark


@router.patch("/marks/{mark_id}", response_model=MarkAutoResponse)
def update_mark(
    mark_id: int,
    mark_data: MarkAutoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Обновление марки (только админ)"""
    mark = db.query(MarkAuto).filter(MarkAuto.id_mark == mark_id).first()
    if not mark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Марка не найдена"
        )
    
    if mark_data.mark_name:
        mark.mark_name = mark_data.mark_name
    
    db.commit()
    db.refresh(mark)
    return mark


@router.delete("/marks/{mark_id}")
def delete_mark(
    mark_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Удаление марки (только админ)"""
    mark = db.query(MarkAuto).filter(MarkAuto.id_mark == mark_id).first()
    if not mark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Марка не найдена"
        )
    
    if mark.models:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Невозможно удалить марку с привязанными моделями"
        )
    
    db.delete(mark)
    db.commit()
    return {"message": "Марка успешно удалена"}


# ============= МОДЕЛИ АВТОМОБИЛЕЙ =============

@router.get("/models", response_model=List[ModelAutoResponse])
def get_models(
    mark_id: Optional[int] = Query(None, description="Фильтр по марке"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """Получение списка моделей автомобилей"""
    query = db.query(ModelAuto)
    
    if mark_id:
        query = query.filter(ModelAuto.id_mark == mark_id)
    
    models = query.order_by(ModelAuto.model_name).all()
    
    # Добавляем название марки
    for model in models:
        if model.mark:
            model.mark_name = model.mark.mark_name
    
    return models


@router.post("/models", response_model=ModelAutoResponse, status_code=status.HTTP_201_CREATED)
def create_model(
    model_data: ModelAutoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Создание новой модели (только админ)"""
    # Проверяем существование марки
    mark = db.query(MarkAuto).filter(MarkAuto.id_mark == model_data.id_mark).first()
    if not mark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Марка не найдена"
        )
    
    model = ModelAuto(**model_data.dict())
    db.add(model)
    db.commit()
    db.refresh(model)
    
    model.mark_name = mark.mark_name
    return model


@router.patch("/models/{model_id}", response_model=ModelAutoResponse)
def update_model(
    model_id: int,
    model_data: ModelAutoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Обновление модели (только админ)"""
    model = db.query(ModelAuto).filter(ModelAuto.id_model == model_id).first()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Модель не найдена"
        )
    
    update_data = model_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(model, field, value)
    
    db.commit()
    db.refresh(model)
    
    if model.mark:
        model.mark_name = model.mark.mark_name
    
    return model


@router.delete("/models/{model_id}")
def delete_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Удаление модели (только админ)"""
    model = db.query(ModelAuto).filter(ModelAuto.id_model == model_id).first()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Модель не найдена"
        )
    
    db.delete(model)
    db.commit()
    return {"message": "Модель успешно удалена"}


# ============= АБОНЕНТЫ (ВЛАДЕЛЬЦЫ) =============

@router.get("/abonents", response_model=List[AbonentResponse])
def get_abonents(
    org_id: Optional[int] = Query(None, description="Фильтр по организации"),
    search: Optional[str] = Query(None, description="Поиск по ФИО"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """Получение списка абонентов"""
    query = db.query(Abonent)
    
    if org_id:
        query = query.filter(Abonent.id_org == org_id)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Abonent.surname.ilike(search_filter)) |
            (Abonent.name.ilike(search_filter)) |
            (Abonent.otchestvo.ilike(search_filter))
        )
    
    abonents = query.order_by(Abonent.surname, Abonent.name).all()
    
    # Добавляем название организации
    for abonent in abonents:
        if abonent.organization:
            abonent.org_name = abonent.organization.org_name
    
    return abonents


@router.get("/abonents/paged", response_model=AbonentListResponse)
def get_abonents_paged(
    org_id: Optional[int] = Query(None, description="Фильтр по организации"),
    search: Optional[str] = Query(None, description="Поиск по ФИО"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    query = db.query(Abonent)

    if org_id:
        query = query.filter(Abonent.id_org == org_id)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Abonent.surname.ilike(search_filter)) |
            (Abonent.name.ilike(search_filter)) |
            (Abonent.otchestvo.ilike(search_filter))
        )

    total = query.with_entities(func.count(Abonent.id_fio)).scalar()
    abonents = query.order_by(Abonent.surname, Abonent.name).offset(skip).limit(limit).all()

    for abonent in abonents:
        if abonent.organization:
            abonent.org_name = abonent.organization.org_name

    return {"items": abonents, "total": int(total or 0), "skip": skip, "limit": limit}


@router.post("/abonents", response_model=AbonentResponse, status_code=status.HTTP_201_CREATED)
def create_abonent(
    abonent_data: AbonentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """Создание нового абонента"""
    # Проверяем существование организации
    org = db.query(Organiz).filter(Organiz.id_org == abonent_data.id_org).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Организация не найдена"
        )
    
    abonent = Abonent(**abonent_data.dict())
    db.add(abonent)
    db.commit()
    db.refresh(abonent)
    
    abonent.org_name = org.org_name
    return abonent


@router.get("/abonents/{abonent_id}", response_model=AbonentResponse)
def get_abonent(
    abonent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """Получение абонента по ID"""
    abonent = db.query(Abonent).filter(Abonent.id_fio == abonent_id).first()
    if not abonent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Абонент не найден"
        )
    
    if abonent.organization:
        abonent.org_name = abonent.organization.org_name
    
    return abonent


@router.patch("/abonents/{abonent_id}", response_model=AbonentResponse)
def update_abonent(
    abonent_id: int,
    abonent_data: AbonentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """Обновление абонента"""
    abonent = db.query(Abonent).filter(Abonent.id_fio == abonent_id).first()
    if not abonent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Абонент не найден"
        )
    
    update_data = abonent_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(abonent, field, value)
    
    db.commit()
    db.refresh(abonent)
    
    if abonent.organization:
        abonent.org_name = abonent.organization.org_name
    
    return abonent


@router.delete("/abonents/{abonent_id}")
def delete_abonent(
    abonent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """Удаление абонента"""
    abonent = db.query(Abonent).filter(Abonent.id_fio == abonent_id).first()
    if not abonent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Абонент не найден"
        )
    
    if abonent.propusks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Невозможно удалить абонента с привязанными пропусками"
        )
    
    db.delete(abonent)
    db.commit()
    return {"message": "Абонент успешно удалён"}
