"""
Быстрый сидер: создаёт справочные данные и 10 пропусков с разными статусами.
Понадобится для проверки печати PDF/логики статусов.
"""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from database import SessionLocal
from models import (
    User, UserRole,
    Organiz, MarkAuto, ModelAuto, Abonent,
    Propusk, PropuskStatus
)


def get_or_create(session: Session, model, defaults=None, **filters):
    instance = session.query(model).filter_by(**filters).first()
    if instance:
        return instance
    params = defaults or {}
    params.update(filters)
    instance = model(**params)
    session.add(instance)
    session.commit()
    session.refresh(instance)
    return instance


def ensure_base_data(session: Session):
    admin = session.query(User).filter_by(username="admin").first()
    if not admin:
        admin = User(
            username="admin",
            password_hash="$2b$12$Kme/vX6k8.vM0E/O6seO3eipMxCNyrHZIkMJNHJdzqq0l1XVgWB8O",  # "admin123"
            role=UserRole.ADMIN,
            full_name="Admin User",
            is_active=True
        )
        session.add(admin)
        session.commit()
        session.refresh(admin)

    org = get_or_create(session, Organiz, org_name="ООО Логистик", defaults={"free_mesto": 5})
    mark = get_or_create(session, MarkAuto, mark_name="Hyundai")
    model = get_or_create(session, ModelAuto, model_name="Porter", id_mark=mark.id_mark)
    abonent = get_or_create(session, Abonent,
                            surname="Иванов", name="Иван", otchestvo="Иванович", id_org=org.id_org)
    return admin, org, mark, model, abonent


def seed_propusks(session: Session, admin, org, mark, model, abonent):
    session.query(Propusk).delete()  # чистим для демонстрации; уберите если не нужно
    session.commit()

    statuses = [
        PropuskStatus.DRAFT,
        PropuskStatus.ACTIVE,
        PropuskStatus.PENDING_DELETE,
        PropuskStatus.REVOKED,
    ]

    created = []
    today = date.today()
    for idx in range(10):
        status = statuses[idx % len(statuses)]
        p = Propusk(
            gos_id=f"A{100 + idx}BC{idx}",
            id_mark_auto=mark.id_mark,
            id_model_auto=model.id_model,
            id_org=org.id_org,
            release_date=today - timedelta(days=idx),
            valid_until=today + timedelta(days=14 - idx),
            id_fio=abonent.id_fio,
            status=status,
            info=f"Demo propusk #{idx} ({status.value})",
            created_by=admin.id,
        )
        session.add(p)
        created.append(p)

    session.commit()
    return created


def main():
    session = SessionLocal()
    try:
        admin, org, mark, model, abonent = ensure_base_data(session)
        props = seed_propusks(session, admin, org, mark, model, abonent)
        print(f"Создано {len(props)} пропусков: {[p.status.value for p in props]}")
        print("Активные можно печатать через /api/propusk/{id}/pdf")
    finally:
        session.close()


if __name__ == "__main__":
    main()
