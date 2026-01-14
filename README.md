# Пропуска автотранспорта (FastAPI)
## ?????????? ? Python
?????? ???????? ? Python 3.12 (????????????? ?????? ??? ??????? ? ????????? ????????????).
?? 3.11 ?????? ???????????, ?? ?? ?????????????.
?? 3.13/3.14 ???????? ?????? ???????????? ?? ?????????? (????? ???????????/Rust).


Сервис для ведения пропускного режима автотранспорта: учет пропусков, справочников, пользователей и ролей, генерация PDF и история изменений. В комплекте легкий фронтенд на чистом JS/Material-style (отдаётся самим API).

## Основной функционал
- Авторизация по JWT, роли: admin, manager, guard, viewer.
- Управление пользователями (создание, редактирование, отключение/удаление).
- Пропуска: создание, активация, пометка на удаление, аннулирование, архивирование, история изменений, выгрузка PDF (одиночно/пакет).
- Справочники: организации, марки, модели, водители (abonents). Проверка целостности связей при создании пропуска.
- Логи уведомлений (модель заложена), фоновые шрифты для PDF (DejaVu).
- REST API с OpenAPI-доками `/docs`; фронтенд доступен на корне `/`.

## Быстрый старт (локально)
Требования: Python 3.10+, PostgreSQL.

```bash
git clone <repo>
cd Car-transport-pass-system

# 1) Создать и активировать venv
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\Activate.ps1

# 2) Установить зависимости
pip install --upgrade pip
pip install -r requirements.txt

# 3) Настроить переменные окружения (при необходимости)
set DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/propusk_system
set SECRET_KEY=your_secret_key

# 4) Подготовить БД (создать схемы/данные)
python init_db.py
python seed_data.py        # базовые данные
python seed_propusks.py    # демо-пропуска (опционально)
python create_admin.py     # создать учётку администратора

# 5) Запустить API + фронтенд
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Открыть:
- Фронтенд: http://localhost:8000/
- API/Swagger: http://localhost:8000/docs
- Health-check: http://localhost:8000/health

## Настройки
Переменные читаются через Pydantic Settings (`config.py`):
- `DATABASE_URL` — строка подключения PostgreSQL.
- `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` — JWT.
- `APP_NAME`, `APP_VERSION`, `DEBUG`.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — заготовка для уведомлений.

По умолчанию значения прописаны в `config.py`; для продакшена вынесите их в `.env`.

## Структура
- `main.py` — точка входа FastAPI, подключение роутеров и фронтенда.
- `models.py` — SQLAlchemy-модели (пользователи, пропуска, справочники, история, архив).
- `auth/` — схемы, сервис, зависимости, роуты авторизации и CRUD пользователей.
- `propusk/` — схемы, сервисы, роуты, генератор PDF.
- `references/` — CRUD справочников (организации, марки, модели, абоненты).
- Скрипты: `init_db.py`, `seed_data.py`, `seed_propusks.py`, `create_admin.py`, `install_fonts.py`.
- Тесты: `test_auth.py`.
- Фронтенд: `frontend/` (HTML/CSS/JS, модальные формы, таблицы, табы для справочников).

## Проверка
Минимально:
- `pytest test_auth.py` — авторизация и токены.
- Ручной прогон через Swagger (`/docs`) и фронтенд.

## Полезное
- При смене ролей/доступов пересоздайте токен (релогин).
- PDF доступны только для активных пропусков (`/api/propusk/{id}/pdf`).
- Для корректной кириллицы в PDF установите шрифты (`python install_fonts.py` при необходимости).***
