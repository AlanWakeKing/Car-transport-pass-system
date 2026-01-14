"""
Скрипт для создания всех таблиц и проверки подключения к БД
"""
from database import Base, engine, check_connection
from models import (
    User, Organiz, Abonent, MarkAuto, ModelAuto, 
    Propusk, PropuskArchive, PropuskHistory, NotificationLog, PropuskTemplate, ReportTemplate
)


def create_tables():
    """
    Создание всех таблиц в базе данных
    """
    print("🔧 Начинаю создание таблиц...")
    try:
        # Создаём все таблицы
        Base.metadata.create_all(bind=engine)
        print("✅ Все таблицы успешно созданы!")
        return True
    except Exception as e:
        print(f"❌ Ошибка при создании таблиц: {e}")
        return False


def drop_tables():
    """
    ОСТОРОЖНО! Удаляет все таблицы из базы данных
    Используй только для полного пересоздания БД
    """
    print("⚠️  ВНИМАНИЕ! Удаляю все таблицы...")
    try:
        Base.metadata.drop_all(bind=engine)
        print("✅ Все таблицы удалены!")
        return True
    except Exception as e:
        print(f"❌ Ошибка при удалении таблиц: {e}")
        return False


def show_tables_info():
    """
    Показывает информацию о созданных таблицах
    """
    print("\n📋 Список таблиц в базе данных:")
    print("=" * 50)
    tables = [
        ("users", "Пользователи системы"),
        ("organiz", "Организации"),
        ("abonent", "Владельцы автомобилей"),
        ("mark_auto", "Марки автомобилей"),
        ("model_auto", "Модели автомобилей"),
        ("propusk", "Пропуска (активные)"),
        ("propusk_archive", "Архив отозванных пропусков"),
        ("propusk_history", "История изменений пропусков"),
                ("propusk_template",
        ("report_template", "??????? PDF ???????"),
         "??????? PDF-?????????"),
        ("notifications_log", "Лог уведомлений"),
    ]
    
    for table_name, description in tables:
        print(f"  • {table_name:25} - {description}")
    print("=" * 50)


if __name__ == "__main__":
    print("\n" + "="*60)
    print("   ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ СИСТЕМЫ УПРАВЛЕНИЯ ПРОПУСКАМИ")
    print("="*60 + "\n")
    
    # Шаг 1: Проверка подключения
    print("Шаг 1: Проверка подключения к базе данных")
    print("-" * 60)
    if not check_connection():
        print("\n❌ Не удалось подключиться к базе данных!")
        print("Проверь параметры подключения в файле database.py")
        exit(1)
    
    # Шаг 2: Создание таблиц
    print("\nШаг 2: Создание таблиц")
    print("-" * 60)
    
    # Спрашиваем, нужно ли пересоздать таблицы
    print("\n⚠️  Если таблицы уже существуют, они будут пересозданы (все данные будут потеряны!)")
    recreate = input("Пересоздать таблицы? (yes/no): ").strip().lower()
    
    if recreate == "yes":
        drop_tables()
        print()
    
    if create_tables():
        show_tables_info()
        print("\n✅ База данных готова к работе!")
    else:
        print("\n❌ Ошибка при инициализации базы данных!")
        exit(1)
    
    print("\n" + "="*60)
    print("   ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА")
    print("="*60 + "\n")