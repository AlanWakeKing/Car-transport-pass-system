"""
Скрипт для скачивания и установки шрифтов DejaVu
"""
import os
import urllib.request
import zipfile
from pathlib import Path


def install_fonts():
    print("\n" + "="*60)
    print("   УСТАНОВКА ШРИФТОВ ДЛЯ PDF")
    print("="*60 + "\n")
    
    # Создаём папку для шрифтов
    fonts_dir = Path("propusk/fonts")
    fonts_dir.mkdir(parents=True, exist_ok=True)
    print(f"✅ Папка создана: {fonts_dir}")
    
    # URL для скачивания DejaVu шрифтов
    url = "https://github.com/dejavu-fonts/dejavu-fonts/releases/download/version_2_37/dejavu-fonts-ttf-2.37.zip"
    zip_path = "dejavu-fonts.zip"
    
    # Проверяем, не установлены ли уже шрифты
    font_files = [
        fonts_dir / "DejaVuSans.ttf",
        fonts_dir / "DejaVuSans-Bold.ttf"
    ]
    
    if all(f.exists() for f in font_files):
        print("✅ Шрифты уже установлены!")
        print(f"   {font_files[0]}")
        print(f"   {font_files[1]}")
        return
    
    print(f"📥 Скачиваю шрифты с GitHub...")
    print(f"   URL: {url}")
    
    try:
        # Скачиваем
        urllib.request.urlretrieve(url, zip_path)
        print("✅ Файл скачан!")
        
        # Распаковываем
        print("📦 Распаковываю архив...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # Извлекаем только нужные TTF файлы
            for file in zip_ref.namelist():
                if file.endswith("DejaVuSans.ttf") or file.endswith("DejaVuSans-Bold.ttf"):
                    # Извлекаем файл
                    zip_ref.extract(file)
                    
                    # Перемещаем в нашу папку fonts
                    source = Path(file)
                    target = fonts_dir / source.name
                    
                    if source.exists():
                        source.rename(target)
                        print(f"   ✅ {target.name}")
        
        # Удаляем архив и временные папки
        os.remove(zip_path)
        
        # Удаляем временную папку dejavu-fonts-ttf-2.37
        import shutil
        temp_dir = Path("dejavu-fonts-ttf-2.37")
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
        
        print("\n" + "="*60)
        print("   ✅ ШРИФТЫ УСПЕШНО УСТАНОВЛЕНЫ!")
        print("="*60 + "\n")
        
        print("📋 Установленные файлы:")
        for font_file in font_files:
            if font_file.exists():
                size = font_file.stat().st_size / 1024  # KB
                print(f"   {font_file.name} ({size:.1f} KB)")
        
        print("\n🔄 Теперь перезапусти сервер:")
        print("   python main.py")
        print()
        
    except Exception as e:
        print(f"\n❌ Ошибка при установке шрифтов: {e}")
        print("\nПопробуй скачать вручную:")
        print(f"1. Открой в браузере: {url}")
        print("2. Распакуй архив")
        print("3. Скопируй DejaVuSans.ttf и DejaVuSans-Bold.ttf")
        print(f"4. В папку: {fonts_dir.absolute()}")


if __name__ == "__main__":
    install_fonts()