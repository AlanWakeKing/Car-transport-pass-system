"""
Скрипт для создания тестовых данных
"""
from database import SessionLocal
from models import Organiz, MarkAuto, ModelAuto, Abonent, User, UserRole
from auth.service import AuthService


def seed_database():
    """
    Заполнение базы тестовыми данными
    """
    print("\n" + "="*60)
    print("   СОЗДАНИЕ ТЕСТОВЫХ ДАННЫХ")
    print("="*60 + "\n")
    
    db = SessionLocal()
    
    try:
        # ============= ОРГАНИЗАЦИИ =============
        print("📋 Создание организаций...")
        
        organizations = [
            {"org_name": "ООО Лукавто", "free_mesto": 10},
            {"org_name": "ПАО Газпром", "free_mesto": 25},
            {"org_name": "ООО Рога и Копыта", "free_mesto": 5},
            {"org_name": "ИП Иванов", "free_mesto": 3},
        ]
        
        created_orgs = []
        for org_data in organizations:
            # Проверяем, не существует ли уже
            existing = db.query(Organiz).filter(Organiz.org_name == org_data["org_name"]).first()
            if not existing:
                org = Organiz(**org_data)
                db.add(org)
                db.flush()
                created_orgs.append(org)
                print(f"   ✅ {org.org_name} (ID: {org.id_org})")
            else:
                created_orgs.append(existing)
                print(f"   ⏭️  {org_data['org_name']} уже существует")
        
        db.commit()
        
        # ============= МАРКИ АВТОМОБИЛЕЙ =============
        print("\n🚗 Создание марок автомобилей...")
        
        marks = [
            "MERCEDES",
            "BMW",
            "TOYOTA",
            "VOLKSWAGEN",
            "LADA",
            "KIA",
            "HYUNDAI"
        ]
        
        created_marks = []
        for mark_name in marks:
            existing = db.query(MarkAuto).filter(MarkAuto.mark_name == mark_name).first()
            if not existing:
                mark = MarkAuto(mark_name=mark_name)
                db.add(mark)
                db.flush()
                created_marks.append(mark)
                print(f"   ✅ {mark.mark_name} (ID: {mark.id_mark})")
            else:
                created_marks.append(existing)
                print(f"   ⏭️  {mark_name} уже существует")
        
        db.commit()
        
        # ============= МОДЕЛИ АВТОМОБИЛЕЙ =============
        print("\n🏎️  Создание моделей автомобилей...")
        
        models_data = [
            # Mercedes
            {"mark": "MERCEDES", "models": ["C 530", "E 200", "GLE 350", "S 500"]},
            # BMW
            {"mark": "BMW", "models": ["X5", "320i", "M3", "X3"]},
            # Toyota
            {"mark": "TOYOTA", "models": ["Camry", "RAV4", "Land Cruiser", "Corolla"]},
            # Volkswagen
            {"mark": "VOLKSWAGEN", "models": ["Polo", "Tiguan", "Passat"]},
            # Lada
            {"mark": "LADA", "models": ["Vesta", "Granta", "Niva"]},
            # Kia
            {"mark": "KIA", "models": ["Rio", "Sportage", "Sorento"]},
            # Hyundai
            {"mark": "HYUNDAI", "models": ["Solaris", "Creta", "Tucson"]},
        ]
        
        for mark_data in models_data:
            mark = db.query(MarkAuto).filter(MarkAuto.mark_name == mark_data["mark"]).first()
            if mark:
                for model_name in mark_data["models"]:
                    existing = db.query(ModelAuto).filter(
                        ModelAuto.id_mark == mark.id_mark,
                        ModelAuto.model_name == model_name
                    ).first()
                    
                    if not existing:
                        model = ModelAuto(id_mark=mark.id_mark, model_name=model_name)
                        db.add(model)
                        db.flush()
                        print(f"   ✅ {mark.mark_name} {model.model_name} (ID: {model.id_model})")
                    else:
                        print(f"   ⏭️  {mark_data['mark']} {model_name} уже существует")
        
        db.commit()
        
        # ============= АБОНЕНТЫ =============
        print("\n👥 Создание абонентов...")
        
        abonents_data = [
            {"surname": "Иванов", "name": "Иван", "otchestvo": "Иванович", "org": "ООО Лукавто", "info": "Директор"},
            {"surname": "Петров", "name": "Петр", "otchestvo": "Петрович", "org": "ООО Лукавто", "info": "Менеджер"},
            {"surname": "Сидоров", "name": "Сидор", "otchestvo": "Сидорович", "org": "ПАО Газпром", "info": None},
            {"surname": "Смирнов", "name": "Алексей", "otchestvo": "Викторович", "org": "ООО Рога и Копыта", "info": "Водитель"},
            {"surname": "Кузнецов", "name": "Дмитрий", "otchestvo": None, "org": "ИП Иванов", "info": None},
        ]
        
        for abonent_data in abonents_data:
            org = db.query(Organiz).filter(Organiz.org_name == abonent_data["org"]).first()
            if org:
                existing = db.query(Abonent).filter(
                    Abonent.surname == abonent_data["surname"],
                    Abonent.name == abonent_data["name"]
                ).first()
                
                if not existing:
                    abonent = Abonent(
                        surname=abonent_data["surname"],
                        name=abonent_data["name"],
                        otchestvo=abonent_data["otchestvo"],
                        id_org=org.id_org,
                        info=abonent_data["info"]
                    )
                    db.add(abonent)
                    db.flush()
                    print(f"   ✅ {abonent.full_name} - {org.org_name} (ID: {abonent.id_fio})")
                else:
                    print(f"   ⏭️  {abonent_data['surname']} {abonent_data['name']} уже существует")
        
        db.commit()
        
        # ============= ТЕСТОВЫЕ ПОЛЬЗОВАТЕЛИ =============
        print("\n👤 Создание тестовых пользователей...")
        
        test_users = [
            {
                "username": "manager1",
                "password": "manager1",
                "full_name": "Менеджер Оформитель",
                "role": UserRole.MANAGER_CREATOR
            },
            {
                "username": "manager2",
                "password": "manager2",
                "full_name": "Менеджер Контролёр",
                "role": UserRole.MANAGER_CONTROLLER
            },
            {
                "username": "operator",
                "password": "operator",
                "full_name": "Оператор Системы",
                "role": UserRole.OPERATOR
            },
            {
                "username": "guard",
                "password": "guard",
                "full_name": "Охранник",
                "role": UserRole.GUARD
            }
        ]
        
        for user_data in test_users:
            existing = db.query(User).filter(User.username == user_data["username"]).first()
            if not existing:
                try:
                    user = AuthService.create_user(
                        db=db,
                        username=user_data["username"],
                        password=user_data["password"],
                        full_name=user_data["full_name"],
                        role=user_data["role"]
                    )
                    print(f"   ✅ {user.username} ({user.role}) - пароль: {user_data['password']}")
                except Exception as e:
                    print(f"   ❌ Ошибка создания {user_data['username']}: {e}")
            else:
                print(f"   ⏭️  {user_data['username']} уже существует")
        
        print("\n" + "="*60)
        print("   ✅ ТЕСТОВЫЕ ДАННЫЕ СОЗДАНЫ!")
        print("="*60 + "\n")
        
        print("📊 Статистика:")
        print(f"   Организаций: {db.query(Organiz).count()}")
        print(f"   Марок авто: {db.query(MarkAuto).count()}")
        print(f"   Моделей авто: {db.query(ModelAuto).count()}")
        print(f"   Абонентов: {db.query(Abonent).count()}")
        print(f"   Пользователей: {db.query(User).count()}")
        
        print("\n💡 Учётные данные для тестирования:")
        print("   admin / [твой пароль]")
        print("   manager1 / manager1")
        print("   manager2 / manager2")
        print("   operator / operator")
        print("   guard / guard")
        print()
        
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()