"""
Скрипт для создания первого пользователя-администратора
"""
from database import SessionLocal
from models import User, UserRole
from auth.service import AuthService
from auth.permissions import PERMISSION_KEYS


def create_admin():
    """
    Создание администратора
    """
    print("\n" + "="*60)
    print("   СОЗДАНИЕ АДМИНИСТРАТОРА СИСТЕМЫ")
    print("="*60 + "\n")
    
    db = SessionLocal()
    
    try:
        # Проверяем, нет ли уже администратора
        existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        
        if existing_admin:
            print("⚠️  В системе уже есть администратор:")
            print(f"   Логин: {existing_admin.username}")
            print(f"   ФИО: {existing_admin.full_name}")
            print()
            
            choice = input("Создать ещё одного администратора? (yes/no): ").strip().lower()
            if choice != "yes":
                print("Отменено.")
                return
        
        # Вводим данные
        print("Введите данные нового администратора:\n")
        
        username = input("Логин (3-50 символов): ").strip()
        if len(username) < 3:
            print("❌ Логин слишком короткий!")
            return
        
        # Проверяем уникальность логина
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"❌ Пользователь с логином '{username}' уже существует!")
            return
        
        full_name = input("ФИО (полное имя): ").strip()
        if len(full_name) < 3:
            print("❌ ФИО слишком короткое!")
            return
        
        password = input("Пароль (минимум 6 символов): ").strip()
        if len(password) < 6:
            print("❌ Пароль слишком короткий!")
            return
        
        password_confirm = input("Подтвердите пароль: ").strip()
        if password != password_confirm:
            print("❌ Пароли не совпадают!")
            return
        
        # Создаём администратора
        print("\n🔧 Создаю администратора...")
        
        admin = AuthService.create_user(
            db=db,
            username=username,
            password=password,
            full_name=full_name,
            role=UserRole.ADMIN,
            permissions={key: True for key in PERMISSION_KEYS}
        )
        
        print("\n✅ Администратор успешно создан!")
        print(f"   ID: {admin.id}")
        print(f"   Логин: {admin.username}")
        print(f"   ФИО: {admin.full_name}")
        print(f"   Роль: {admin.role}")
        print()
        print("Теперь можешь войти в систему с этими данными!")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Ошибка при создании администратора: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()