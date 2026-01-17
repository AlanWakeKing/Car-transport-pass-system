"""
Сервис для работы с пропусками
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from fastapi import HTTPException, status
from typing import Optional, List
from datetime import date
import json

from models import (
    Propusk, PropuskStatus, PropuskArchive, PropuskHistory, 
    HistoryAction, User, UserRole, Organiz, MarkAuto, ModelAuto, Abonent
)


class PropuskService:
    """Сервис для работы с пропусками"""
    
    @staticmethod
    def create_propusk(db: Session, propusk_data: dict, created_by: int) -> Propusk:
        """
        Создание нового пропуска в статусе "Черновик"
        """
        # Проверяем существование связанных записей
        PropuskService._validate_references(db, propusk_data)

        if not propusk_data.get("pass_type"):
            propusk_data["pass_type"] = "drive"
        
        # Создаём пропуск
        propusk = Propusk(
            **propusk_data,
            status=PropuskStatus.DRAFT,
            created_by=created_by
        )
        
        db.add(propusk)
        db.flush()
        
        # Записываем в историю
        PropuskService._add_history(
            db=db,
            propusk_id=propusk.id_propusk,
            action=HistoryAction.CREATED,
            user_id=created_by,
            new_values=json.dumps(propusk_data, default=str),
            comment="Пропуск создан"
        )
        
        db.commit()
        db.refresh(propusk)
        return propusk
    
    @staticmethod
    def update_propusk(db: Session, propusk_id: int, update_data: dict, user_id: int) -> Propusk:
        """
        Обновление пропуска
        """
        propusk = PropuskService.get_propusk_by_id(db, propusk_id)
        
        if not propusk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пропуск не найден"
            )
        
        # Проверяем, можно ли редактировать
        if propusk.status == PropuskStatus.REVOKED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя редактировать отозванный пропуск"
            )
        
        # Сохраняем старые значения
        old_values = {
            "gos_id": propusk.gos_id,
            "id_mark_auto": propusk.id_mark_auto,
            "id_model_auto": propusk.id_model_auto,
            "id_org": propusk.id_org,
            "pass_type": propusk.pass_type,
            "release_date": str(propusk.release_date),
            "valid_until": str(propusk.valid_until),
            "id_fio": propusk.id_fio,
            "info": propusk.info
        }
        
        # Обновляем поля
        for field, value in update_data.items():
            if value is not None and hasattr(propusk, field):
                setattr(propusk, field, value)
        
        # Записываем в историю
        PropuskService._add_history(
            db=db,
            propusk_id=propusk.id_propusk,
            action=HistoryAction.EDITED,
            user_id=user_id,
            old_values=json.dumps(old_values, default=str),
            new_values=json.dumps(update_data, default=str),
            comment="Пропуск изменён"
        )
        
        db.commit()
        db.refresh(propusk)
        return propusk
    
    @staticmethod
    def activate_propusk(db: Session, propusk_id: int, user_id: int, comment: Optional[str] = None) -> Propusk:
        """
        Активация пропуска (Черновик → Активный)
        Доступно по праву активации
        """
        propusk = PropuskService.get_propusk_by_id(db, propusk_id)
        
        if not propusk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пропуск не найден"
            )
        
        if propusk.status != PropuskStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Нельзя активировать пропуск в статусе '{propusk.status.value}'"
            )
        
        propusk.status = PropuskStatus.ACTIVE
        
        PropuskService._add_history(
            db=db,
            propusk_id=propusk.id_propusk,
            action=HistoryAction.ACTIVATED,
            user_id=user_id,
            old_values=json.dumps({"status": PropuskStatus.DRAFT.value}),
            new_values=json.dumps({"status": PropuskStatus.ACTIVE.value}),
            comment=comment or "Пропуск активирован"
        )
        
        db.commit()
        db.refresh(propusk)
        return propusk
    
    @staticmethod
    def mark_for_deletion(db: Session, propusk_id: int, user_id: int, comment: Optional[str] = None) -> Propusk:
        """
        Пометка на удаление (Активный → На удалении)
        Доступно по праву пометки на удаление
        """
        propusk = PropuskService.get_propusk_by_id(db, propusk_id)
        
        if not propusk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пропуск не найден"
            )
        
        if propusk.status != PropuskStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Нельзя пометить на удаление пропуск в статусе '{propusk.status.value}'"
            )
        
        propusk.status = PropuskStatus.PENDING_DELETE
        
        PropuskService._add_history(
            db=db,
            propusk_id=propusk.id_propusk,
            action=HistoryAction.MARKED_DELETE,
            user_id=user_id,
            old_values=json.dumps({"status": PropuskStatus.ACTIVE.value}),
            new_values=json.dumps({"status": PropuskStatus.PENDING_DELETE.value}),
            comment=comment or "Помечен на удаление"
        )
        
        db.commit()
        db.refresh(propusk)
        return propusk
    
    @staticmethod
    def revoke_propusk(db: Session, propusk_id: int, user_id: int, comment: Optional[str] = None) -> Propusk:
        """
        Отзыв пропуска (Активный → Отозван)
        Доступно по праву аннулирования
        """
        propusk = PropuskService.get_propusk_by_id(db, propusk_id)
        
        if not propusk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пропуск не найден"
            )
        
        if propusk.status not in [PropuskStatus.ACTIVE, PropuskStatus.PENDING_DELETE]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Нельзя отозвать пропуск в статусе '{propusk.status.value}'"
            )
        
        old_status = propusk.status.value
        propusk.status = PropuskStatus.REVOKED
        
        PropuskService._add_history(
            db=db,
            propusk_id=propusk.id_propusk,
            action=HistoryAction.REVOKED,
            user_id=user_id,
            old_values=json.dumps({"status": old_status}),
            new_values=json.dumps({"status": PropuskStatus.REVOKED.value}),
            comment=comment or "Пропуск отозван"
        )
        
        db.commit()
        db.refresh(propusk)
        return propusk
    
    @staticmethod
    def archive_propusk(db: Session, propusk_id: int, user_id: int) -> dict:
        """
        Архивирование отозванного пропуска
        Перемещает из propusk в propusk_archive
        Доступно только для admin
        """
        propusk = PropuskService.get_propusk_by_id(db, propusk_id)
        
        if not propusk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пропуск не найден"
            )
        
        if propusk.status != PropuskStatus.REVOKED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Можно архивировать только отозванные пропуска"
            )
        
        # Создаём запись в архиве
        archive = PropuskArchive(
            id_propusk=propusk.id_propusk,
            gos_id=propusk.gos_id,
            id_mark_auto=propusk.id_mark_auto,
            id_model_auto=propusk.id_model_auto,
            id_org=propusk.id_org,
            release_date=propusk.release_date,
            valid_until=propusk.valid_until,
            id_fio=propusk.id_fio,
            status=propusk.status.value,
            info=propusk.info,
            created_by=propusk.created_by,
            created_at=propusk.created_at,
            archived_by=user_id
        )
        
        db.add(archive)
        
        # Удаляем из основной таблицы
        db.delete(propusk)
        
        db.commit()
        
        return {
            "message": "Пропуск успешно архивирован",
            "archive_id": archive.id,
            "original_id": archive.id_propusk
        }
    @staticmethod
    def restore_propusk(db: Session, propusk_id: int, user_id: int, comment: Optional[str] = None) -> Propusk:
        """
        Восстановление аннулированного пропуска
        Если пропуск в propusk, переводим REVOKED -> ACTIVE.
        Если пропуск в архиве, возвращаем его в propusk со статусом REVOKED.
        """
        propusk = db.query(Propusk).filter(Propusk.id_propusk == propusk_id).first()
        if propusk:
            if propusk.status != PropuskStatus.REVOKED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Можно восстановить только аннулированный пропуск"
                )
            old_status = propusk.status.value
            propusk.status = PropuskStatus.DRAFT
            PropuskService._add_history(
                db=db,
                propusk_id=propusk.id_propusk,
                action=HistoryAction.EDITED,
                user_id=user_id,
                old_values=json.dumps({"status": old_status}),
                new_values=json.dumps({"status": PropuskStatus.DRAFT.value}),
                comment=comment or "Пропуск восстановлен"
            )
            db.commit()
            db.refresh(propusk)
            return propusk

        archive = db.query(PropuskArchive).filter(
            PropuskArchive.id_propusk == propusk_id
        ).first()

        if not archive:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пропуск не найден"
            )

        existing_propusk = db.query(Propusk).filter(
            Propusk.id_propusk == propusk_id
        ).first()

        if existing_propusk:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пропуск уже присутствует в основной таблице"
            )

        propusk = Propusk(
            id_propusk=archive.id_propusk,
            gos_id=archive.gos_id,
            id_mark_auto=archive.id_mark_auto,
            id_model_auto=archive.id_model_auto,
            id_org=archive.id_org,
            release_date=archive.release_date,
            valid_until=archive.valid_until,
            id_fio=archive.id_fio,
            status=PropuskStatus.DRAFT,
            info=archive.info,
            created_by=archive.created_by,
            created_at=archive.created_at
        )

        db.add(propusk)
        db.delete(archive)

        PropuskService._add_history(
            db=db,
            propusk_id=propusk.id_propusk,
            action=HistoryAction.EDITED,
            user_id=user_id,
            old_values=json.dumps({"status": "archived"}),
            new_values=json.dumps({"status": PropuskStatus.DRAFT.value}),
            comment=comment or "Пропуск восстановлен из архива"
        )

        db.commit()
        db.refresh(propusk)
        return propusk
    
    @staticmethod
    def get_propusk_by_id(db: Session, propusk_id: int) -> Optional[Propusk]:
        """Получение пропуска по ID"""
        return db.query(Propusk).filter(Propusk.id_propusk == propusk_id).first()
    
    @staticmethod
    def get_propusks(
        db: Session,
        status: Optional[object] = None,
        id_org: Optional[int] = None,
        gos_id: Optional[str] = None,
        id_fio: Optional[int] = None,
        created_by: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Propusk]:
        """
        Получение списка пропусков с фильтрацией
        """
        query = db.query(Propusk)
        
        # Фильтры
        if status:
            if isinstance(status, (list, tuple, set)):
                query = query.filter(Propusk.status.in_(list(status)))
            else:
                query = query.filter(Propusk.status == status)
        
        if id_org:
            query = query.filter(Propusk.id_org == id_org)
        
        if gos_id:
            query = query.filter(Propusk.gos_id.ilike(f"%{gos_id}%"))
        
        if id_fio:
            query = query.filter(Propusk.id_fio == id_fio)
        
        if created_by:
            query = query.filter(Propusk.created_by == created_by)
        
        if date_from:
            query = query.filter(Propusk.release_date >= date_from)
        
        if date_to:
            query = query.filter(Propusk.valid_until <= date_to)
        
        # Поиск по гос. номеру или ФИО владельца
        if search:
            query = query.join(Abonent).join(Organiz).filter(
                or_(
                    Propusk.gos_id.ilike(f"%{search}%"),
                    Organiz.org_name.ilike(f"%{search}%"),
                    Abonent.surname.ilike(f"%{search}%"),
                    Abonent.name.ilike(f"%{search}%"),
                    Abonent.otchestvo.ilike(f"%{search}%")
                )
            )
        
        return query.order_by(Propusk.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def count_propusks(
        db: Session,
        status: Optional[object] = None,
        id_org: Optional[int] = None,
        gos_id: Optional[str] = None,
        id_fio: Optional[int] = None,
        created_by: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        search: Optional[str] = None
    ) -> int:
        query = db.query(func.count(Propusk.id_propusk))

        if status:
            if isinstance(status, (list, tuple, set)):
                query = query.filter(Propusk.status.in_(list(status)))
            else:
                query = query.filter(Propusk.status == status)

        if id_org:
            query = query.filter(Propusk.id_org == id_org)

        if gos_id:
            query = query.filter(Propusk.gos_id.ilike(f"%{gos_id}%"))

        if id_fio:
            query = query.filter(Propusk.id_fio == id_fio)

        if created_by:
            query = query.filter(Propusk.created_by == created_by)

        if date_from:
            query = query.filter(Propusk.release_date >= date_from)

        if date_to:
            query = query.filter(Propusk.valid_until <= date_to)

        if search:
            query = query.join(Abonent).join(Organiz).filter(
                or_(
                    Propusk.gos_id.ilike(f"%{search}%"),
                    Organiz.org_name.ilike(f"%{search}%"),
                    Abonent.surname.ilike(f"%{search}%"),
                    Abonent.name.ilike(f"%{search}%"),
                    Abonent.otchestvo.ilike(f"%{search}%")
                )
            )

        total = query.scalar()
        return int(total or 0)

    @staticmethod
    def count_by_status(
        db: Session,
        allowed_statuses: Optional[list] = None
    ) -> dict:
        query = db.query(Propusk.status, func.count(Propusk.id_propusk))
        if allowed_statuses:
            query = query.filter(Propusk.status.in_(allowed_statuses))
        rows = query.group_by(Propusk.status).all()
        counts = {}
        for status, count in rows:
            key = status.value if hasattr(status, "value") else str(status)
            counts[key] = int(count)
        return counts
    
    @staticmethod
    def get_propusk_history(db: Session, propusk_id: int) -> List[PropuskHistory]:
        """Получение истории изменений пропуска"""
        return db.query(PropuskHistory)\
            .filter(PropuskHistory.id_propusk == propusk_id)\
            .order_by(PropuskHistory.timestamp.desc())\
            .all()
    
    @staticmethod
    def _validate_references(db: Session, data: dict):
        """Валидация связанных записей"""
        # Проверяем организацию
        org = db.query(Organiz).filter(Organiz.id_org == data.get('id_org')).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Организация не найдена"
            )
        
        # Проверяем марку
        mark = db.query(MarkAuto).filter(MarkAuto.id_mark == data.get('id_mark_auto')).first()
        if not mark:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Марка автомобиля не найдена"
            )
        
        # Проверяем модель
        model = db.query(ModelAuto).filter(ModelAuto.id_model == data.get('id_model_auto')).first()
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Модель автомобиля не найдена"
            )
        
        # Проверяем соответствие модели и марки
        if model.id_mark != data.get('id_mark_auto'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Модель не соответствует выбранной марке"
            )
        
        # Проверяем абонента
        abonent = db.query(Abonent).filter(Abonent.id_fio == data.get('id_fio')).first()
        if not abonent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Абонент не найден"
            )
    
    @staticmethod
    def _add_history(
        db: Session,
        propusk_id: int,
        action: HistoryAction,
        user_id: int,
        old_values: Optional[str] = None,
        new_values: Optional[str] = None,
        comment: Optional[str] = None
    ):
        """Добавление записи в историю"""
        history = PropuskHistory(
            id_propusk=propusk_id,
            action=action,
            changed_by=user_id,
            old_values=old_values,
            new_values=new_values,
            comment=comment
        )
        db.add(history)
