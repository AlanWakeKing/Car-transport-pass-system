import json
from sqlalchemy.orm import Session

from models import PropuskTemplate, ReportTemplate


def get_active_template(db: Session):
    return db.query(PropuskTemplate).filter(PropuskTemplate.is_active.is_(True)).order_by(PropuskTemplate.created_at.desc()).first()


def list_recent_templates(db: Session, limit: int = 2):
    return db.query(PropuskTemplate).order_by(PropuskTemplate.created_at.desc()).limit(limit).all()


def save_template(db: Session, data: dict, created_by: int) -> PropuskTemplate:
    latest = db.query(PropuskTemplate).order_by(PropuskTemplate.version.desc()).first()
    version = (latest.version if latest else 0) + 1

    db.query(PropuskTemplate).filter(PropuskTemplate.is_active.is_(True)).update({PropuskTemplate.is_active: False})

    template = PropuskTemplate(
        version=version,
        data=json.dumps(data),
        created_by=created_by,
        is_active=True,
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    # keep only last 2 versions
    recent = list_recent_templates(db, limit=2)
    recent_ids = {t.id for t in recent}
    db.query(PropuskTemplate).filter(~PropuskTemplate.id.in_(recent_ids)).delete(synchronize_session=False)
    db.commit()

    return template


def get_active_report_template(db: Session):
    return db.query(ReportTemplate).filter(ReportTemplate.is_active.is_(True)).order_by(ReportTemplate.created_at.desc()).first()


def list_recent_report_templates(db: Session, limit: int = 2):
    return db.query(ReportTemplate).order_by(ReportTemplate.created_at.desc()).limit(limit).all()


def save_report_template(db: Session, data: dict, created_by: int) -> ReportTemplate:
    latest = db.query(ReportTemplate).order_by(ReportTemplate.version.desc()).first()
    version = (latest.version if latest else 0) + 1

    db.query(ReportTemplate).filter(ReportTemplate.is_active.is_(True)).update({ReportTemplate.is_active: False})

    template = ReportTemplate(
        version=version,
        data=json.dumps(data),
        created_by=created_by,
        is_active=True,
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    recent = list_recent_report_templates(db, limit=2)
    recent_ids = {t.id for t in recent}
    db.query(ReportTemplate).filter(~ReportTemplate.id.in_(recent_ids)).delete(synchronize_session=False)
    db.commit()

    return template
