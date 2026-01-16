# Пропуска автотранспорта (FastAPI)

Система управления пропусками автотранспорта с веб-интерфейсом, правами доступа и генерацией PDF.

## Требования
- Python 3.12 (обязательно).
- PostgreSQL.

Примечание: версии 3.13/3.14 не поддерживаются из-за зависимостей (pydantic-core/Rust wheels).

## Основной функционал
- Роли: admin, manager, guard, viewer.
- Гибкие права (extra_permissions):
  - создание/редактирование/удаление пропусков,
  - активация,
  - аннулирование,
  - пометка на удаление,
  - редактирование организаций,
  - скачивание PDF,
  - видимость пунктов меню (включая "Главная", "PDF" и "Настройки").
- Пропуска:
  - создание и редактирование,
  - активация,
  - пометка на удаление,
  - аннулирование,
  - восстановление аннулированного пропуска (в статус "Черновик"),
  - архивирование,
  - история изменений.
- PDF:
  - одиночная печать,
  - пакетная печать,
  - отчёт по организациям (по одной организации и по всем организациям, только активные пропуска).
- Визуальные редакторы шаблонов:
  - пропуск (100x90 мм, сетка),
  - отчет по организациям (шаблон применяется к PDF),
  - хранение последних версий шаблонов.
- Главная (мониторинг) с кликабельными карточками статусов и переходом на фильтрованный список пропусков,
  переходы доступны только при наличии прав.
- Справочники:
  - организации, марки, модели,
  - водители (привязаны к организации).
- REST API + Swagger /docs, фронтенд на /.

## Быстрый старт (локально)
Перед началом убедитесь, что PostgreSQL запущен и доступен по `DATABASE_URL`.

### Windows (PowerShell)
```powershell
cd Car-transport-pass-system

# 1) Создать venv на Python 3.12
py -3.12 -m venv venv312

# 2) Установить зависимости
.\venv312\Scripts\python.exe -m pip install -r requirements.txt

# 3) Переменные окружения (при необходимости)
$env:DATABASE_URL="postgresql+psycopg://user:pass@localhost:5432/propusk_system"
$env:SECRET_KEY="your_secret_key"
$env:CORS_ALLOW_ORIGINS="http://localhost:8000,http://127.0.0.1:8000"
$env:COOKIE_SECURE="False"
$env:COOKIE_SAMESITE="lax"

# 4) Подготовить БД
.\venv312\Scripts\python.exe init_db.py
.\venv312\Scripts\python.exe seed_data.py
.\venv312\Scripts\python.exe seed_propusks.py    # опционально
.\venv312\Scripts\python.exe create_admin.py

# 5) Запуск
.\venv312\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Можно запускать через `run.ps1`, он использует `venv312`.

### macOS / Linux (bash/zsh)
```bash
cd Car-transport-pass-system

# 1) Создать venv на Python 3.12
python3.12 -m venv venv312

# 2) Установить зависимости
./venv312/bin/python -m pip install -r requirements.txt

# 3) Переменные окружения (при необходимости)
export DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/propusk_system
export SECRET_KEY=your_secret_key
export CORS_ALLOW_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
export COOKIE_SECURE=False
export COOKIE_SAMESITE=lax

# 4) Подготовить БД
./venv312/bin/python init_db.py
./venv312/bin/python seed_data.py
./venv312/bin/python seed_propusks.py    # опционально
./venv312/bin/python create_admin.py

# 5) Запуск
./venv312/bin/python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Открыть:
- Фронтенд: http://localhost:8000/
- API/Swagger: http://localhost:8000/docs
- Health-check: http://localhost:8000/health

## Настройки
Во фронтенде "Настройки" разделены на вкладки:
- Шаблон отчета по организациям (визуальный редактор).
- Шаблон пропуска (визуальный редактор, сетка).

Переменные читаются через Pydantic Settings (config.py):
- DATABASE_URL - строка подключения PostgreSQL.
- SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES - JWT.
- TELEGRAM_BOT_TOKEN, TELEGRAM_AUTH_MAX_AGE_SECONDS - Telegram Login.
- CORS_ALLOW_ORIGINS - список разрешённых origin через запятую.
- COOKIE_SECURE, COOKIE_SAMESITE - параметры httpOnly cookie.
- APP_NAME, APP_VERSION, DEBUG.

По умолчанию значения прописаны в config.py; для продакшена вынесите их в .env.

## Структура
- main.py - точка входа FastAPI, подключение роутеров и фронтенда.
- models.py - SQLAlchemy модели (пользователи, пропуска, справочники, история, архив, шаблоны).
- auth/ - авторизация, пользователи, права доступа.
- propusk/ - логика пропусков, статусы, PDF.
- references/ - справочники (организации, марки, модели, водители/абоненты).
- settings/ - шаблоны PDF (пропуска и отчеты).
- frontend/ - HTML/CSS/JS интерфейс.
- Скрипты: init_db.py, seed_data.py, seed_propusks.py, create_admin.py, install_fonts.py.

## Полезное
- После изменения прав пользователя нужно перелогиниться (обновить токен).
- Если в интерфейсе вместо русского текста отображаются "???", очистите кэш браузера и убедитесь, что сервер отдает charset=utf-8.
- Для корректной кириллицы в PDF установите шрифты (python install_fonts.py).

## Docker
### 1) Сборка и запуск через Docker

Сборка образа:
```bash
docker build -t propusk-system:latest .
```

Запуск контейнера:
```bash
docker run --rm -p 8000:8000 \
  -e DATABASE_URL=postgresql+psycopg://user:pass@host:5432/propusk_system \
  -e SECRET_KEY=your_secret_key \
  -e CORS_ALLOW_ORIGINS=http://localhost:8000,http://127.0.0.1:8000 \
  -e COOKIE_SECURE=False \
  -e COOKIE_SAMESITE=lax \
  propusk-system:latest
```

Если нужно запускать с локальным `.env`, можно использовать:
```bash
docker run --rm -p 8000:8000 --env-file .env propusk-system:latest
```

### 2) Запуск через docker compose
```bash
# 1) Заполните .env (POSTGRES_* и SECRET_KEY)
# 2) Поднять сервисы
docker compose up -d --build
```

Остановка:
```bash
docker compose down
```

### 3) Инициализация БД (init_db/seed)
После первого запуска контейнеров выполните инициализацию:
```bash
docker compose run --rm app python init_db.py
docker compose run --rm app python seed_data.py
docker compose run --rm app python seed_propusks.py   # опционально
docker compose run --rm app python create_admin.py
```

### 4) Переменные окружения (.env)
Можно задать либо `DATABASE_URL`, либо набор `POSTGRES_*` (если `DATABASE_URL` не задан, он будет собран автоматически).

Минимально нужны:
```
DATABASE_URL=postgresql+psycopg://postgres:postgres@db:5432/propusk_system
SECRET_KEY=your_secret_key
CORS_ALLOW_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
COOKIE_SECURE=False
COOKIE_SAMESITE=lax
```
Альтернатива через `POSTGRES_*`:
```
POSTGRES_DB=propusk_system
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=db
POSTGRES_PORT=5432
SECRET_KEY=your_secret_key
COOKIE_SECURE=False
COOKIE_SAMESITE=lax
```
Дополнительно можно задать:
```
APP_NAME=Пропуска
APP_VERSION=1.0.0
DEBUG=True
ACCESS_TOKEN_EXPIRE_MINUTES=1440
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_AUTH_MAX_AGE_SECONDS=86400
```

### 5) Полный чек‑лист запуска проекта (Docker)
1. Скопируйте/обновите `.env` (DATABASE_URL, SECRET_KEY, CORS_ALLOW_ORIGINS, COOKIE_*).
2. Соберите образ: `docker build -t propusk-system:latest .`
3. Запустите сервисы: `docker compose up -d`
4. Инициализируйте БД (init_db/seed) командами выше.
5. Откройте:
   - Фронтенд: http://localhost:8000/
   - API/Swagger: http://localhost:8000/docs
   - Health-check: http://localhost:8000/health
