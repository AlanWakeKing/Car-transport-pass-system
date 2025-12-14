"""
Скрипт для автоматического создания структуры папок проекта
"""
import os


def create_structure():
    """
    Создаёт структуру папок и пустые __init__.py файлы
    """
    print("\n" + "="*60)
    print("   СОЗДАНИЕ СТРУКТУРЫ ПРОЕКТА")
    print("="*60 + "\n")
    
    # Список папок для создания
    folders = [
        "auth",
        "references",
        "propusk",
        "utils"
    ]
    
    # Создаём папки и __init__.py
    for folder in folders:
        # Создаём папку
        os.makedirs(folder, exist_ok=True)
        print(f"✅ Создана папка: {folder}/")
        
        # Создаём пустой __init__.py
        init_file = os.path.join(folder, "__init__.py")
        if not os.path.exists(init_file):
            with open(init_file, "w", encoding="utf-8") as f:
                f.write(f'"""\n{folder.capitalize()} модуль\n"""\n')
            print(f"   └─ Создан файл: {init_file}")
    
    print("\n" + "="*60)
    print("   СТРУКТУРА СОЗДАНА УСПЕШНО!")
    print("="*60 + "\n")
    
    print("Структура проекта:")
    print("""
propusk_system/
├── auth/
│   └── __init__.py
├── references/
│   └── __init__.py
├── propusk/
│   └── __init__.py
└── utils/
    └── __init__.py
    """)
    
    print("\n✅ Теперь можешь копировать файлы в соответствующие папки!")
    print("   Следуй инструкции в ЗАПУСК_BACKEND.md\n")


if __name__ == "__main__":
    create_structure()