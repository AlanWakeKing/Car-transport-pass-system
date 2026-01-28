"""
Service for temporary passes.
"""
from datetime import datetime, time as dt_time, date as dt_date
from typing import Optional, List

from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from models import TemporaryPass, Organiz


class TemporaryPassService:
    START_TIME = dt_time(8, 0, 0)
    END_TIME = dt_time(20, 0, 0)

    @staticmethod
    def _now() -> datetime:
        return datetime.now().astimezone()

    @staticmethod
    def _get_today_window(now: datetime) -> tuple[datetime, datetime]:
        day = now.date()
        tz = now.tzinfo
        start_dt = datetime.combine(day, TemporaryPassService.START_TIME, tzinfo=tz)
        end_dt = datetime.combine(day, TemporaryPassService.END_TIME, tzinfo=tz)
        return start_dt, end_dt

    @staticmethod
    def _ensure_business_hours(now: datetime) -> tuple[datetime, datetime]:
        start_dt, end_dt = TemporaryPassService._get_today_window(now)
        if now < start_dt or now >= end_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Временный пропуск можно выдавать только с 08:00 до 20:00",
            )
        return start_dt, end_dt

    @staticmethod
    def _get_org_or_404(db: Session, id_org: int) -> Organiz:
        org = db.query(Organiz).filter(Organiz.id_org == id_org).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Организация не найдена",
            )
        return org

    @staticmethod
    def _check_capacity(db: Session, id_org: int, now: datetime) -> None:
        org = TemporaryPassService._get_org_or_404(db, id_org)
        if not org.free_mesto or org.free_mesto <= 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="У организации нет свободных гостевых мест",
            )
        active_count = (
            db.query(func.count(TemporaryPass.id))
            .filter(
                TemporaryPass.id_org == id_org,
                TemporaryPass.revoked_at.is_(None),
                TemporaryPass.valid_from <= now,
                TemporaryPass.valid_until > now,
            )
            .scalar()
        )
        if (active_count or 0) >= org.free_mesto:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Свободные гостевые места закончились",
            )

    @staticmethod
    def _check_duplicate_gos_id(db: Session, gos_id: str, now: datetime) -> None:
        exists = (
            db.query(TemporaryPass.id)
            .filter(
                TemporaryPass.gos_id == gos_id,
                TemporaryPass.revoked_at.is_(None),
                TemporaryPass.valid_from <= now,
                TemporaryPass.valid_until > now,
            )
            .first()
        )
        if exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Активный временный пропуск для этого госномера уже существует",
            )

    @staticmethod
    def create_pass(db: Session, payload: dict, created_by: int) -> TemporaryPass:
        now = TemporaryPassService._now()
        start_dt, end_dt = TemporaryPassService._ensure_business_hours(now)
        TemporaryPassService._check_capacity(db, payload.get("id_org"), now)
        TemporaryPassService._check_duplicate_gos_id(db, payload.get("gos_id"), now)

        temp_pass = TemporaryPass(
            gos_id=payload.get("gos_id"),
            id_org=payload.get("id_org"),
            phone=payload.get("phone"),
            comment=payload.get("comment"),
            valid_from=start_dt,
            valid_until=end_dt,
            created_by=created_by,
        )
        db.add(temp_pass)
        db.commit()
        db.refresh(temp_pass)
        return temp_pass

    @staticmethod
    def revoke_pass(
        db: Session,
        pass_id: int,
        user_id: int,
        comment: Optional[str] = None,
    ) -> TemporaryPass:
        temp_pass = (
            db.query(TemporaryPass)
            .filter(TemporaryPass.id == pass_id)
            .first()
        )
        if not temp_pass:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Временный пропуск не найден",
            )
        if temp_pass.revoked_at:
            return temp_pass
        temp_pass.revoked_at = TemporaryPassService._now()
        temp_pass.revoked_by = user_id
        if comment:
            temp_pass.comment = comment
        db.commit()
        db.refresh(temp_pass)
        return temp_pass

    @staticmethod
    def delete_pass(db: Session, pass_id: int) -> None:
        temp_pass = (
            db.query(TemporaryPass)
            .filter(TemporaryPass.id == pass_id)
            .first()
        )
        if not temp_pass:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Временный пропуск не найден",
            )
        db.delete(temp_pass)
        db.commit()

    @staticmethod
    def mark_enter(db: Session, pass_id: int) -> TemporaryPass:
        temp_pass = (
            db.query(TemporaryPass)
            .filter(TemporaryPass.id == pass_id)
            .first()
        )
        if not temp_pass:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Временный пропуск не найден",
            )
        if temp_pass.entered_at:
            return temp_pass
        temp_pass.entered_at = TemporaryPassService._now()
        db.commit()
        db.refresh(temp_pass)
        return temp_pass

    @staticmethod
    def mark_exit(db: Session, pass_id: int, user_id: int) -> TemporaryPass:
        temp_pass = (
            db.query(TemporaryPass)
            .filter(TemporaryPass.id == pass_id)
            .first()
        )
        if not temp_pass:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Временный пропуск не найден",
            )
        if temp_pass.exited_at:
            return temp_pass
        if not temp_pass.entered_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя отметить выезд без отметки въезда",
            )
        temp_pass.exited_at = TemporaryPassService._now()
        temp_pass.revoked_at = temp_pass.exited_at
        temp_pass.revoked_by = user_id
        db.commit()
        db.refresh(temp_pass)
        return temp_pass

    @staticmethod
    def get_pass(db: Session, pass_id: int) -> Optional[TemporaryPass]:
        return db.query(TemporaryPass).filter(TemporaryPass.id == pass_id).first()

    @staticmethod
    def list_passes(
        db: Session,
        status_filter: Optional[str] = None,
        id_org: Optional[int] = None,
        gos_id: Optional[str] = None,
        date_from: Optional[dt_date] = None,
        date_to: Optional[dt_date] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[TemporaryPass]:
        query = db.query(TemporaryPass)
        if id_org:
            query = query.filter(TemporaryPass.id_org == id_org)
        if gos_id:
            query = query.filter(TemporaryPass.gos_id.ilike(f"%{gos_id}%"))
        if date_from:
            query = query.filter(func.date(TemporaryPass.valid_from) >= date_from)
        if date_to:
            query = query.filter(func.date(TemporaryPass.valid_until) <= date_to)

        now = TemporaryPassService._now()
        if status_filter == "active":
            query = query.filter(
                TemporaryPass.revoked_at.is_(None),
                TemporaryPass.valid_from <= now,
                TemporaryPass.valid_until > now,
            )
        elif status_filter == "revoked":
            query = query.filter(TemporaryPass.revoked_at.is_not(None))
        elif status_filter == "expired":
            query = query.filter(
                TemporaryPass.revoked_at.is_(None),
                TemporaryPass.valid_until <= now,
            )

        return query.order_by(TemporaryPass.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def count_passes(
        db: Session,
        status_filter: Optional[str] = None,
        id_org: Optional[int] = None,
        gos_id: Optional[str] = None,
        date_from: Optional[dt_date] = None,
        date_to: Optional[dt_date] = None,
    ) -> int:
        query = db.query(func.count(TemporaryPass.id))
        if id_org:
            query = query.filter(TemporaryPass.id_org == id_org)
        if gos_id:
            query = query.filter(TemporaryPass.gos_id.ilike(f"%{gos_id}%"))
        if date_from:
            query = query.filter(func.date(TemporaryPass.valid_from) >= date_from)
        if date_to:
            query = query.filter(func.date(TemporaryPass.valid_until) <= date_to)

        now = TemporaryPassService._now()
        if status_filter == "active":
            query = query.filter(
                TemporaryPass.revoked_at.is_(None),
                TemporaryPass.valid_from <= now,
                TemporaryPass.valid_until > now,
            )
        elif status_filter == "revoked":
            query = query.filter(TemporaryPass.revoked_at.is_not(None))
        elif status_filter == "expired":
            query = query.filter(
                TemporaryPass.revoked_at.is_(None),
                TemporaryPass.valid_until <= now,
            )
        total = query.scalar()
        return int(total or 0)
