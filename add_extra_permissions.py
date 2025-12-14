"""
Добавление поля extra_permissions в таблицу users
"""
from database import SessionLocal, engine
from sqlalchemy import text


def add_extra_permissions_column():
    print("\n" + "="*60)
    print("   ДОБАВЛЕНИЕ ПОЛЯ EXTRA_PERMISSIONS")
    print("="*60 + "\n")
    
    db = SessionLocal()
    
    try:
        # Проверяем, есть ли уже это поле
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='extra_permissions'
        """))
        
        if result.fetchone():
            print("✅ Поле extra_permissions уже существует!")
            return
        
        # Добавляем поле
        print("📝 Добавляю поле extra_permissions в таблицу users...")
        db.execute(text("""
            ALTER TABLE users 
            ADD COLUMN extra_permissions TEXT DEFAULT '{}'
        """))
        
        db.commit()
        
        print("✅ Поле успешно добавлено!")
        print("\n" + "="*60)
        print("   МИГРАЦИЯ ЗАВЕРШЕНА")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    add_extra_permissions_column()