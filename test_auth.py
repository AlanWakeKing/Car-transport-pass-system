"""
Тест авторизации - проверка создания и валидации токенов
"""
from database import SessionLocal
from auth.service import AuthService


def test_auth():
    print("\n" + "="*60)
    print("   ТЕСТ СИСТЕМЫ АВТОРИЗАЦИИ")
    print("="*60 + "\n")
    
    db = SessionLocal()
    
    try:
        # Вводим данные
        username = input("Введи username: ").strip()
        password = input("Введи password: ").strip()
        
        print("\n1️⃣ Проверка аутентификации...")
        user = AuthService.authenticate_user(db, username, password)
        
        if not user:
            print("❌ Неверный логин или пароль!")
            return
        
        print(f"✅ Пользователь найден: {user.full_name} ({user.role})")
        
        # Создаём токен
        print("\n2️⃣ Создание токена...")
        token = AuthService.create_access_token(
            data={"sub": str(user.id), "username": user.username, "role": user.role.value}
        )
        
        print(f"✅ Токен создан успешно!")
        print(f"\nТокен (первые 50 символов): {token[:50]}...")
        print(f"Длина токена: {len(token)} символов")
        
        # Проверяем декодирование
        print("\n3️⃣ Проверка декодирования токена...")
        try:
            # Декодируем напрямую без HTTPException
            from jose import jwt
            from config import settings
            
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            print(f"✅ Токен декодирован успешно!")
            print(f"   user_id: {payload.get('sub')}")
            print(f"   username: {payload.get('username')}")
            print(f"   role: {payload.get('role')}")
            print(f"   expires: {payload.get('exp')}")
            
        except Exception as e:
            print(f"❌ Ошибка декодирования: {e}")
            print(f"   Тип ошибки: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            return
        
        # Проверяем получение пользователя по токену
        print("\n4️⃣ Получение пользователя из БД...")
        user_id_from_token = int(payload.get('sub'))  # Конвертируем в число
        user_from_token = AuthService.get_user_by_id(db, user_id_from_token)
        
        if user_from_token:
            print(f"✅ Пользователь получен из БД!")
            print(f"   ID: {user_from_token.id}")
            print(f"   Username: {user_from_token.username}")
            print(f"   Active: {user_from_token.is_active}")
        else:
            print("❌ Пользователь не найден в БД!")
            return
        
        print("\n" + "="*60)
        print("   ✅ ВСЁ РАБОТАЕТ ОТЛИЧНО!")
        print("="*60)
        
        print("\n📋 Используй этот токен в Swagger:")
        print(f"\nBearer {token}")
        print("\nИли в curl:")
        print(f'curl -X GET "http://localhost:8000/api/auth/me" -H "Authorization: Bearer {token}"')
        print()
        
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_auth()