"""
Скрипт для создания тестовых пропусков
"""
from database import SessionLocal
from models import Propusk, PropuskStatus, User, Organiz, MarkAuto, ModelAuto, Abonent
from datetime import date, timedelta


def seed_propusks():
    print("\n" + "="*60)
    print("   СОЗДАНИЕ ТЕСТОВЫХ ПРОПУСКОВ")
    print("="*60 + "\n")
    
    db = SessionLocal()
    
    try:
        # Получаем данные для пропусков
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            print("❌ Администратор не найден! Сначала создай пользователя.")
            return
        
        # Получаем организации, марки, модели, абонентов
        orgs = db.query(Organiz).all()
        marks = db.query(MarkAuto).all()
        abonents = db.query(Abonent).all()
        
        if not all([orgs, marks, abonents]):
            print("❌ Не хватает данных! Сначала запусти seed_data.py")
            return
        
        # Проверяем, есть ли уже пропуска
        existing_count = db.query(Propusk).count()
        if existing_count > 0:
            print(f"⚠️  В базе уже есть {existing_count} пропусков.")
            choice = input("Создать дополнительные тестовые пропуска? (yes/no): ").strip().lower()
            if choice != "yes":
                print("Отменено.")
                return
        
        print("🎫 Создание тестовых пропусков...\n")
        
        # Пропуск 1: Черновик
        mercedes_models = db.query(ModelAuto).filter(ModelAuto.id_mark == 1).all()
        if mercedes_models:
            propusk1 = Propusk(
                gos_id="А 123 АВ 777",
                id_mark_auto=1,  # MERCEDES
                id_model_auto=mercedes_models[0].id_model,
                id_org=orgs[0].id_org,
                release_date=date.today(),
                valid_until=date.today() + timedelta(days=365),
                id_fio=abonents[0].id_fio,
                status=PropuskStatus.DRAFT,
                info="Тестовый черновик",
                created_by=admin.id
            )
            db.add(propusk1)
            print(f"✅ Черновик: {propusk1.gos_id}")
        
        # Пропуск 2: Активный
        bmw_models = db.query(ModelAuto).filter(ModelAuto.id_mark == 2).all()
        if bmw_models and len(abonents) > 1:
            propusk2 = Propusk(
                gos_id="В 456 СД 777",
                id_mark_auto=2,  # BMW
                id_model_auto=bmw_models[0].id_model,
                id_org=orgs[0].id_org if len(orgs) > 0 else orgs[0].id_org,
                release_date=date.today() - timedelta(days=30),
                valid_until=date.today() + timedelta(days=335),
                id_fio=abonents[1].id_fio,
                status=PropuskStatus.ACTIVE,
                info="Активный пропуск",
                created_by=admin.id
            )
            db.add(propusk2)
            print(f"✅ Активный: {propusk2.gos_id}")
        
        # Пропуск 3: Активный
        toyota_models = db.query(ModelAuto).filter(ModelAuto.id_mark == 3).all()
        if toyota_models and len(abonents) > 2:
            propusk3 = Propusk(
                gos_id="С 789 ЕФ 197",
                id_mark_auto=3,  # TOYOTA
                id_model_auto=toyota_models[0].id_model,
                id_org=orgs[1].id_org if len(orgs) > 1 else orgs[0].id_org,
                release_date=date.today() - timedelta(days=60),
                valid_until=date.today() + timedelta(days=305),
                id_fio=abonents[2].id_fio,
                status=PropuskStatus.ACTIVE,
                info="Еще один активный",
                created_by=admin.id
            )
            db.add(propusk3)
            print(f"✅ Активный: {propusk3.gos_id}")
        
        # Пропуск 4: На удалении
        lada_models = db.query(ModelAuto).filter(ModelAuto.id_mark == 5).all()
        if lada_models and len(abonents) > 3:
            propusk4 = Propusk(
                gos_id="Х 111 ГХ 777",
                id_mark_auto=5,  # LADA
                id_model_auto=lada_models[0].id_model,
                id_org=orgs[2].id_org if len(orgs) > 2 else orgs[0].id_org,
                release_date=date.today() - timedelta(days=90),
                valid_until=date.today() + timedelta(days=275),
                id_fio=abonents[3].id_fio,
                status=PropuskStatus.PENDING_DELETE,
                info="Помечен на удаление",
                created_by=admin.id
            )
            db.add(propusk4)
            print(f"✅ На удалении: {propusk4.gos_id}")
        
        # Пропуск 5: Отозван
        kia_models = db.query(ModelAuto).filter(ModelAuto.id_mark == 6).all()
        if kia_models and len(abonents) > 4:
            propusk5 = Propusk(
                gos_id="Т 999 ИЙ 197",
                id_mark_auto=6,  # KIA
                id_model_auto=kia_models[0].id_model,
                id_org=orgs[3].id_org if len(orgs) > 3 else orgs[0].id_org,
                release_date=date.today() - timedelta(days=180),
                valid_until=date.today() - timedelta(days=10),
                id_fio=abonents[4].id_fio,
                status=PropuskStatus.REVOKED,
                info="Отозванный пропуск",
                created_by=admin.id
            )
            db.add(propusk5)
            print(f"✅ Отозван: {propusk5.gos_id}")
        
        db.commit()
        
        print("\n" + "="*60)
        print("   ✅ ТЕСТОВЫЕ ПРОПУСКА СОЗДАНЫ!")
        print("="*60 + "\n")
        
        total = db.query(Propusk).count()
        print(f"📊 Всего пропусков в базе: {total}")
        print(f"   Черновиков: {db.query(Propusk).filter(Propusk.status == PropuskStatus.DRAFT).count()}")
        print(f"   Активных: {db.query(Propusk).filter(Propusk.status == PropuskStatus.ACTIVE).count()}")
        print(f"   На удалении: {db.query(Propusk).filter(Propusk.status == PropuskStatus.PENDING_DELETE).count()}")
        print(f"   Отозванных: {db.query(Propusk).filter(Propusk.status == PropuskStatus.REVOKED).count()}")
        print()
        
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_propusks()