# Fitness Trainer App

Веб-приложение для тренера: календарь записей, учёт пакетов (соло / сплит / бег), история тренировок. Данные хранятся в **Google Таблицах**.

**Инструкция для пользователя (тренер и клиент):** [docs/ИНСТРУКЦИЯ.md](docs/ИНСТРУКЦИЯ.md)

## Стек

- **client/** — React 19, Vite, TypeScript, Redux Toolkit, RTK Query, styled-components
- **server/** — Node.js, Fastify, TypeScript, Google Sheets API v4

## Быстрый старт

### 1. Google Cloud и таблица

1. Создайте проект в [Google Cloud Console](https://console.cloud.google.com/).
2. Включите **Google Sheets API**.
3. Создайте **Service Account** → скачайте JSON-ключ.
4. Создайте Google Таблицу с листами **Clients** и **Sessions** (заголовки см. ниже).
5. Поделитесь таблицей с email сервисного аккаунта (роль **Редактор**).
6. Скопируйте **ID таблицы** из URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

#### Лист Clients (строка 1 — заголовки)

| id | name | surname | solo_remaining | split_remaining | online_remaining | running_remaining | share_token | created_at |

#### Лист DaysOff

| id | date | note | created_at |

`date` — формат `YYYY-MM-DD` (целый день).

#### Лист Sessions

| id | client_id | client_name | start_datetime | end_datetime | workout_type | status | deducted | created_at | updated_at | reassigned | running_group_id |

`deducted`: `true` при отмене со списанием из пакета.  
`reassigned`: `true` если отменённая запись уже переназначена другому клиенту (один раз на слот).  
`running_group_id`: общий id для группового бега на один слот (несколько строк Sessions).

`workout_type`: `solo` | `split` | `online` | `running`  
`status`: `scheduled` | `completed` | `cancelled`

#### Длительность слотов
- `solo` / `split` / `online`: 60 минут (см. `config.slotDurationMinutes`).
- `running`: 90 минут.

При запуске с `INIT_SHEETS=true` сервер создаёт листы **Clients**, **Sessions**, **DaysOff** и пишет заголовки в строку 1. Смотрите вкладки внизу таблицы — не лист «Лист1». Если заголовки пустые, перезапустите сервер после сохранения `.env`.

### 2. Переменные окружения

```bash
cp server/.env.example server/.env
```
/
Заполните `server/.env`:

- `SPREADSHEET_ID` — ID таблицы
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` и `GOOGLE_PRIVATE_KEY` (из JSON ключа; ключ в кавычках, `\n` для переносов)
- `TRAINER_PASSWORD` — пароль входа тренера
- `JWT_SECRET` — случайная строка ≥ 32 символов
- `CLIENT_URL=http://localhost:5173` — URL фронтенда (CORS + ссылки для клиента)

### 3. Установка и запуск

```bash
npm install
npm run dev
```

- Фронтенд: http://localhost:5173  
- API: http://localhost:3001  

Или отдельно:

```bash
npm run dev:server
npm run dev:client
```

## Сценарии проверки (тренер)

1. Откройте главную → «Войти» → пароль из `TRAINER_PASSWORD`.
2. После входа появятся «ЛК» и «Выйти».
3. Клик по свободному слоту в календаре → выберите клиента и тип → «Сохранить».
4. Клик по записи `scheduled` → «Подтвердить» (списание −1) или «Отменить».
5. **ЛК** → таблица клиентов, редактирование остатков, создание клиента.
6. Карточка клиента → остатки, история, «Скопировать ссылку» (всегда активна).

## Сценарий клиента

1. В карточке клиента скопируйте ссылку вида `/c/<token>`.
2. Откройте в браузере без входа — только остатки, ближайшие записи и история.

## Production

Один процесс отдаёт API и собранный фронт (`client/dist`). Локально:

```bash
npm run build
npm start --prefix server
```

Откройте http://localhost:3001 (не Vite). Для разработки UI по-прежнему `npm run dev` (Vite :5173 + proxy `/api`).

### Render (Web Service)

| Поле | Значение |
|------|----------|
| **Build Command** | `npm run build:render` |
| **Start Command** | `npm start --prefix server` |
| **CLIENT_URL** | `https://ваш-сервис.onrender.com` (без `/` в конце) |
| **NODE_ENV** | `production` |

`build:render` ставит dev-зависимости (`@types/node`, `typescript`) даже при `NODE_ENV=production`.

Проверка: `/api/health` → `{"ok":true}`, `/api/health/sheets` → `{"ok":true,"clientsCount":N}` (проверка Google Sheets), `/` и `/login` → React-приложение.

**Google на Render (если `ERR_OSSL_UNSUPPORTED` / `DECODER routines::unsupported`):**

1. **Проще всего:** одна переменная `GOOGLE_SERVICE_ACCOUNT_JSON` — скопируйте **весь** скачанный JSON service account **в одну строку** (без переносов между `{` и `}`). Можно удалить переменные `GOOGLE_SERVICE_ACCOUNT_EMAIL` и `GOOGLE_PRIVATE_KEY`.
2. **Или** `GOOGLE_PRIVATE_KEY` = только поле `private_key` из JSON, с `\n` вместо переносов, в кавычках как в `.env.example`.
3. Email service account — **Редактор** в Google Таблице.

Проверка: `/api/health/sheets` → `{"ok":true,"clientsCount":...}`.

## Правила бизнес-логики

- Подтверждение `scheduled` → `completed` списывает 1 с поля `solo_remaining`, `split_remaining`, `online_remaining` или `running_remaining` по типу слота.
- При остатке 0 — ошибка 400.
- Отмена не меняет остатки.
- Повторное подтверждение уже `completed` — без повторного списания.

Часовой пояс по умолчанию: **Europe/Moscow**, длительность слота: **60 мин**.
