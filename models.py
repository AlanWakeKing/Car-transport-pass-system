"""
Модели базы данных для системы управления пропусками
"""
from sqlalchemy import Column, Integer, BigInteger, String, Boolean, Date, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
import json

from database import Base


# Enum для ролей пользователей
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    GUARD = "guard"  # Guard
    VIEWER = "viewer"  # View only


# Enum для статусов пропуска
class PropuskStatus(str, enum.Enum):
    DRAFT = "draft"  # Черновик
    ACTIVE = "active"  # Активный
    PENDING_DELETE = "pending_delete"  # На удалении
    REVOKED = "revoked"  # Отозван


# Enum для типов действий в истории
class HistoryAction(str, enum.Enum):
    CREATED = "created"
    EDITED = "edited"
    ACTIVATED = "activated"
    MARKED_DELETE = "marked_delete"
    REVOKED = "revoked"
    ARCHIVED = "archived"


# 1. Таблица пользователей
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole, values_callable=lambda enum_cls: [e.value for e in enum_cls], name="userrole"), nullable=False)
    full_name = Column(String(200), nullable=False)
    tg_user_id = Column(BigInteger, unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Дополнительные права (JSON)
    # Пример: {"can_activate": true, "can_archive": true, "can_manage_users": false}
    extra_permissions = Column(Text, default='{}')
    
    # Связи
    created_propusks = relationship("Propusk", back_populates="creator", foreign_keys="Propusk.created_by")

    @property
    def permissions(self):
        """Returns user permissions from JSON."""
        try:
            data = json.loads(self.extra_permissions or "{}")
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}



# 2. Таблица организаций
class Organiz(Base):
    __tablename__ = "organiz"
    
    id_org = Column(Integer, primary_key=True, index=True)
    org_name = Column(String(200), nullable=False, unique=True)
    free_mesto = Column(Integer, default=0)  # Гостевые места
    comment = Column(Text)  # Комментарий
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    abonents = relationship("Abonent", back_populates="organization")
    propusks = relationship("Propusk", back_populates="organization")


# 3. Таблица владельцев (абонентов)
class Abonent(Base):
    __tablename__ = "abonent"
    
    id_fio = Column(Integer, primary_key=True, index=True)
    surname = Column(String(100), nullable=False)
    name = Column(String(100), nullable=False)
    otchestvo = Column(String(100))
    id_org = Column(Integer, ForeignKey("organiz.id_org"), nullable=False)
    info = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    organization = relationship("Organiz", back_populates="abonents")
    propusks = relationship("Propusk", back_populates="abonent")
    
    @property
    def full_name(self):
        """Полное имя"""
        parts = [self.surname, self.name]
        if self.otchestvo:
            parts.append(self.otchestvo)
        return " ".join(parts)


# 4. Таблица марок автомобилей
class MarkAuto(Base):
    __tablename__ = "mark_auto"
    
    id_mark = Column(Integer, primary_key=True, index=True)
    mark_name = Column(String(100), nullable=False, unique=True)
    
    # Связи
    models = relationship("ModelAuto", back_populates="mark", cascade="all, delete-orphan")


# 5. Таблица моделей автомобилей
class ModelAuto(Base):
    __tablename__ = "model_auto"
    
    id_model = Column(Integer, primary_key=True, index=True)
    id_mark = Column(Integer, ForeignKey("mark_auto.id_mark"), nullable=False)
    model_name = Column(String(100), nullable=False)
    
    # Связи
    mark = relationship("MarkAuto", back_populates="models")
    propusks = relationship("Propusk", back_populates="model")


# 6. Таблица пропусков (активные)
class Propusk(Base):
    __tablename__ = "propusk"
    
    id_propusk = Column(Integer, primary_key=True, index=True)
    gos_id = Column(String(20), nullable=False, index=True)  # Гос. номер
    id_mark_auto = Column(Integer, ForeignKey("mark_auto.id_mark"), nullable=False)
    id_model_auto = Column(Integer, ForeignKey("model_auto.id_model"), nullable=False)
    id_org = Column(Integer, ForeignKey("organiz.id_org"), nullable=False)
    pass_type = Column(String(20), nullable=False, server_default="drive")  # Тип пропуска
    release_date = Column(Date, nullable=False)  # Дата выпуска
    valid_until = Column(Date, nullable=False)  # Действителен до
    id_fio = Column(Integer, ForeignKey("abonent.id_fio"), nullable=False)
    status = Column(SQLEnum(PropuskStatus), default=PropuskStatus.DRAFT, nullable=False)
    info = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    mark = relationship("MarkAuto")
    model = relationship("ModelAuto", back_populates="propusks")
    organization = relationship("Organiz", back_populates="propusks")
    abonent = relationship("Abonent", back_populates="propusks")
    creator = relationship("User", back_populates="created_propusks", foreign_keys=[created_by])
    history = relationship("PropuskHistory", back_populates="propusk", cascade="all, delete-orphan")


# 7. Таблица архива пропусков
class PropuskArchive(Base):
    __tablename__ = "propusk_archive"
    
    id = Column(Integer, primary_key=True, index=True)
    id_propusk = Column(Integer, nullable=False, index=True)  # Оригинальный ID
    gos_id = Column(String(20), nullable=False, index=True)
    id_mark_auto = Column(Integer, nullable=False)
    id_model_auto = Column(Integer, nullable=False)
    id_org = Column(Integer, nullable=False)
    release_date = Column(Date, nullable=False)
    valid_until = Column(Date, nullable=False)
    id_fio = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False)
    info = Column(Text)
    created_by = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    archived_at = Column(DateTime(timezone=True), server_default=func.now())
    archived_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Связи
    archiver = relationship("User")


# 8. Таблица истории изменений пропусков
class PropuskHistory(Base):
    __tablename__ = "propusk_history"
    
    id = Column(Integer, primary_key=True, index=True)
    id_propusk = Column(Integer, ForeignKey("propusk.id_propusk"), nullable=False, index=True)
    action = Column(SQLEnum(HistoryAction), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    old_values = Column(Text)  # JSON строка
    new_values = Column(Text)  # JSON строка
    comment = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    propusk = relationship("Propusk", back_populates="history")
    user = relationship("User")


# 9. Таблица лога уведомлений
class NotificationLog(Base):
    __tablename__ = "notifications_log"
    
    id = Column(Integer, primary_key=True, index=True)
    id_propusk = Column(Integer, nullable=False, index=True)
    notification_type = Column(String(50), nullable=False)  # expiring_soon, expired
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), nullable=False)  # sent, failed
    error_message = Column(Text)

# 10. ??????? PDF-?????????
class PropuskTemplate(Base):
    __tablename__ = "propusk_template"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(Integer, nullable=False)
    data = Column(Text, nullable=False)  # JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    creator = relationship("User")

    @property
    def data_json(self):
        try:
            return json.loads(self.data or "{}")
        except Exception:
            return {}


# 11. Report PDF templates
class ReportTemplate(Base):
    __tablename__ = "report_template"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(Integer, nullable=False)
    data = Column(Text, nullable=False)  # JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    creator = relationship("User")

    @property
    def data_json(self):
        try:
            return json.loads(self.data or "{}")
        except Exception:
            return {}
