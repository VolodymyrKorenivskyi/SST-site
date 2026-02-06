# Техническая документация системы управления терминалами самообслуживания (SST Site)

## 1. Общее описание

**SST Site** — веб-приложение для управления терминалами самообслуживания, которые принимают наличные и пополняют карты или счета. Система обеспечивает полный цикл управления: от поиска локаций для установки терминалов до мониторинга их состояния и выполнения операций (инкассация, ремонт).

### Основные функции:
- Управление терминалами самообслуживания
- Поиск и управление локациями для установки терминалов
- Система ролей и прав доступа (RBAC)
- Аудит действий пользователей
- Двухфакторная аутентификация (2FA)
- Многоязычность (RU, EN, KY)
- Отправка email-уведомлений (заявки на инкассацию)

## 2. Архитектура системы

### 2.1. Общая архитектура

Система построена по **клиент-серверной архитектуре** с разделением на frontend и backend:

```
┌─────────────────┐
│   React SPA      │  Frontend (клиент)
│   (TypeScript)   │
└────────┬─────────┘
         │ HTTP/REST API
         │
┌────────▼─────────┐
│   Express.js      │  Backend (сервер)
│   REST API       │
└────────┬─────────┘
         │
┌────────▼─────────┐
│   SQLite DB      │  База данных
└─────────────────┘
```

### 2.2. Технологический стек

#### Backend:
- **Node.js** — среда выполнения
- **TypeScript** — язык программирования
- **Express.js** — веб-фреймворк для REST API
- **SQLite** (better-sqlite3) — база данных
- **bcrypt** — хеширование паролей
- **speakeasy** — генерация TOTP для 2FA
- **nodemailer** — отправка email
- **helmet** — безопасность HTTP заголовков
- **express-rate-limit** — ограничение частоты запросов
- **cookie-parser** — работа с cookies (сессии)
- **zod** — валидация данных

#### Frontend:
- **React 18** — UI библиотека
- **TypeScript** — типизация
- **Vite** — сборщик и dev-сервер
- **React Router** — маршрутизация
- **Axios** — HTTP клиент
- **i18next** — интернационализация (RU, EN, KY)
- **xlsx** — работа с Excel файлами

### 2.3. Структура проекта

```
SST-site/
├── server/                      # Backend
│   ├── index.ts                # Точка входа сервера
│   ├── database/               # Работа с БД
│   │   ├── connection.ts       # Подключение к БД
│   │   └── migrate.ts          # Миграции БД
│   ├── routes/                 # API маршруты
│   │   ├── auth.ts             # Аутентификация
│   │   ├── users.ts            # Управление пользователями
│   │   ├── terminals.ts        # Управление терминалами
│   │   ├── admin.ts            # Административные функции
│   │   ├── roleRequests.ts    # Заявки на роли
│   │   └── 2fa.ts              # Двухфакторная аутентификация
│   ├── services/               # Бизнес-логика
│   │   ├── AuthService.ts      # Сервис аутентификации
│   │   ├── EmailService.ts     # Отправка email
│   │   ├── TwoFactorService.ts # 2FA логика
│   │   ├── RoleRequestService.ts # Обработка заявок на роли
│   │   └── AuditService.ts     # Аудит действий
│   ├── middleware/             # Middleware
│   │   ├── auth.ts             # Проверка аутентификации
│   │   ├── rbac.ts             # Проверка прав доступа
│   │   ├── rateLimit.ts        # Ограничение запросов
│   │   ├── validation.ts       # Валидация данных
│   │   └── errorHandler.ts     # Обработка ошибок
│   ├── types/                  # TypeScript типы
│   │   ├── index.ts            # Общие типы
│   │   ├── models.ts           # Модели БД
│   │   └── roleRequests.ts     # Типы для заявок
│   └── scripts/                # Вспомогательные скрипты
│       ├── addAdmin.ts         # Создание администратора
│       ├── importLocations.ts   # Импорт локаций из Excel
│       └── ...
│
├── client/                      # Frontend
│   ├── src/
│   │   ├── main.tsx            # Точка входа React
│   │   ├── App.tsx             # Главный компонент
│   │   ├── components/         # React компоненты
│   │   │   ├── Layout.tsx      # Общий layout
│   │   │   └── Navigation.tsx  # Навигация
│   │   ├── pages/              # Страницы
│   │   │   ├── Home.tsx        # Главная (список терминалов)
│   │   │   ├── ProfilePage.tsx # Профиль пользователя
│   │   │   ├── StatusPage.tsx  # Страница статуса
│   │   │   ├── auth/           # Страницы аутентификации
│   │   │   ├── admin/          # Административные страницы
│   │   │   └── terminals/      # Страницы терминалов
│   │   ├── contexts/           # React контексты
│   │   │   └── AuthContext.tsx # Контекст аутентификации
│   │   ├── hooks/              # React хуки
│   │   │   └── useAuth.ts      # Хук для работы с аутентификацией
│   │   ├── services/           # API сервисы
│   │   │   └── api.ts          # HTTP клиент (Axios)
│   │   └── i18n/               # Интернационализация
│   │       ├── config.ts       # Конфигурация i18n
│   │       └── locales/       # Файлы переводов
│   │           ├── ru.json
│   │           ├── en.json
│   │           └── ky.json
│   ├── index.html
│   ├── vite.config.ts          # Конфигурация Vite
│   └── package.json
│
├── data/                        # Данные
│   ├── sst-site.db             # SQLite база данных
│   └── pictures/               # Изображения
│
├── package.json                 # Корневой package.json
├── tsconfig.json               # TypeScript конфигурация
└── README.md                   # Документация проекта
```

## 3. База данных

### 3.1. Схема базы данных

База данных использует **SQLite** с следующими основными таблицами:

#### Основные таблицы:

1. **users** — пользователи системы
   - id, email, password_hash
   - first_name, middle_name, last_name
   - phone, telegram, avatar_url
   - company_name, job_title
   - timezone, country, language
   - status (active/blocked/deleted)
   - is_email_verified, is_2fa_enabled
   - failed_login_attempts, blocked_until
   - created_at, updated_at, last_login_at

2. **roles** — роли пользователей
   - id, name (admin, manager, director, guest)
   - description, created_at

3. **user_roles** — связь пользователей и ролей
   - user_id, role_id
   - assigned_at, assigned_by

4. **terminals** — терминалы самообслуживания
   - id, id_terminal (уникальный ID терминала)
   - object_name, location_type_id
   - address, city, latitude, longitude, map_url
   - contact_name, contact_phones, contact_telegrams
   - working_hours, has_cable_connection
   - rent_cost_kg, rent_cost_usd
   - presentation_url, add_info, status
   - status_date, last_contact_date
   - created_at, updated_at

5. **locations** — локации для установки терминалов
   - id, object_name, location_type_id
   - address, city, latitude, longitude, map_url
   - contact_name, contact_phones, contact_telegrams
   - working_hours, has_cable_connection
   - rent_cost_kg, rent_cost_usd
   - presentation_url, add_info, status_id
   - status_date, last_contact_date
   - created_at, updated_at

6. **location_statuses** — справочник статусов локаций
   - id, code, name_ru, name_en, name_ky
   - description_ru, description_en, description_ky
   - created_at

7. **location_types** — типы сред размещения
   - id, code, name_ru, name_en, name_ky

8. **sessions** — сессии пользователей
   - id (токен сессии), user_id
   - expires_at, user_agent, ip_address
   - created_at, last_activity_at

9. **verification_codes** — коды подтверждения
   - id, user_id, code, type
   - expires_at, is_used, created_at

10. **role_requests** — заявки на роли
    - id, user_id, requested_role_id
    - status (pending/approved/rejected)
    - message, reviewed_by, reviewed_at
    - created_at

11. **audit_logs** — журнал аудита
    - id, user_id, action
    - entity_type, entity_id
    - ip_address, user_agent, details
    - created_at

12. **app_settings** — настройки приложения
    - key, value, description
    - value_type, updated_at, updated_by

### 3.2. Индексы

База данных содержит индексы для оптимизации запросов:
- Индексы по email, status для users
- Индексы по user_id, role_id для user_roles
- Индексы по expires_at для sessions и verification_codes
- Индексы по id_terminal для terminals (UNIQUE)
- Индексы по status_id для locations

## 4. API Endpoints

### 4.1. Аутентификация (`/api/auth`)

- `POST /api/auth/register` — регистрация нового пользователя
- `POST /api/auth/login` — вход в систему
- `POST /api/auth/login/verify-2fa` — подтверждение 2FA
- `POST /api/auth/logout` — выход из системы
- `GET /api/auth/me` — получение текущего пользователя
- `POST /api/auth/forgot-password` — запрос на восстановление пароля
- `POST /api/auth/reset-password` — сброс пароля

### 4.2. Пользователи (`/api/users`)

- `GET /api/users` — список пользователей (требует роль admin)
- `GET /api/users/:id` — информация о пользователе
- `PATCH /api/users/:id` — обновление пользователя
- `DELETE /api/users/:id` — удаление пользователя (требует роль admin)

### 4.3. Терминалы (`/api/terminals`)

- `GET /api/terminals` — список терминалов
- `GET /api/terminals/:id` — информация о терминале
- `PATCH /api/terminals/:id` — обновление терминала
- `POST /api/terminals/collection-request` — заявка на инкассацию (отправка email)

### 4.4. Локации (`/api/terminals/locations`)

- `GET /api/terminals/locations` — список локаций
- `GET /api/terminals/locations/:id` — информация о локации
- `POST /api/terminals/locations` — создание локации
- `PATCH /api/terminals/locations/:id` — обновление локации
- `DELETE /api/terminals/locations/:id` — удаление локации

### 4.5. Административные функции (`/api/admin`)

- `GET /api/admin/users` — управление пользователями
- `GET /api/admin/role-requests` — заявки на роли
- `POST /api/admin/role-requests/:id/approve` — одобрение заявки
- `POST /api/admin/role-requests/:id/reject` — отклонение заявки
- `GET /api/admin/audit-logs` — журнал аудита
- `GET /api/admin/settings` — настройки приложения
- `PATCH /api/admin/settings` — обновление настроек

### 4.6. 2FA (`/api/2fa`)

- `POST /api/2fa/enable` — включение 2FA
- `POST /api/2fa/disable` — отключение 2FA
- `GET /api/2fa/qr-code` — получение QR-кода для настройки

## 5. Система безопасности

### 5.1. Аутентификация

- Использование сессий на основе cookies (httpOnly, secure в production)
- Хеширование паролей с помощью bcrypt (10 раундов)
- Защита от брутфорса: блокировка после 5 неудачных попыток
- Двухфакторная аутентификация (TOTP) через Google Authenticator

### 5.2. Авторизация (RBAC)

Система ролей:
- **admin** — полный доступ ко всем функциям
- **manager** — управление терминалами и локациями
- **director** — просмотр отчетов и статистики
- **guest** — ограниченный доступ (только просмотр)

Проверка прав доступа через middleware `rbac.ts`.

### 5.3. Защита от атак

- **Helmet** — установка безопасных HTTP заголовков
- **CORS** — настройка разрешенных источников
- **Rate Limiting** — ограничение частоты запросов (100 запросов/15 минут)
- **Валидация данных** — проверка входных данных через Zod
- **SQL Injection защита** — использование prepared statements (better-sqlite3)

### 5.4. Аудит

Все важные действия пользователей логируются в таблицу `audit_logs`:
- Вход/выход из системы
- Изменение данных терминалов/локаций
- Изменение ролей пользователей
- Административные действия

## 6. Развертывание

### 6.1. Требования к окружению

- **Node.js** >= 18.x
- **npm** >= 9.x
- **SQLite** (встроен в better-sqlite3)

### 6.2. Переменные окружения

Создать файл `.env` в корне проекта:

```env
# Server
PORT=3000
NODE_ENV=production
CLIENT_URL=http://localhost:5173

# Database
DB_PATH=./data/sst-site.db

# SMTP (для отправки email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@sst-site.com

# Session
SESSION_SECRET=your-secret-key-here
```

### 6.3. Установка и запуск

```bash
# Установка зависимостей
npm run install:all

# Миграция базы данных
npm run db:migrate

# Создание администратора
npm run db:add-admin

# Сборка проекта
npm run build

# Запуск в production
npm start
```

### 6.4. Структура для деплоя

Для production рекомендуется:
- Использовать PM2 или systemd для управления процессом
- Настроить reverse proxy (nginx) для статических файлов
- Использовать HTTPS (SSL сертификат)
- Настроить резервное копирование базы данных
- Настроить мониторинг и логирование

## 7. Функциональные возможности

### 7.1. Управление терминалами

- Просмотр списка терминалов с фильтрацией и поиском
- Просмотр детальной информации о терминале
- Редактирование данных терминала (ID, адрес, контакты и т.д.)
- Отправка заявок на инкассацию (email)
- Отображение терминалов на карте

### 7.2. Управление локациями

- Поиск локаций для установки терминалов
- Создание и редактирование локаций
- Управление статусами локаций (в поиске, рассмотрение, подключено и т.д.)
- Импорт локаций из Excel
- Фильтрация по статусам

### 7.3. Административные функции

- Управление пользователями
- Рассмотрение заявок на роли
- Просмотр журнала аудита
- Настройка системы

### 7.4. Многоязычность

Система поддерживает 3 языка:
- Русский (ru) — по умолчанию
- English (en)
- Кыргызча (ky)

Переключение языка через интерфейс пользователя.

## 8. Производительность

### 8.1. Оптимизации

- Индексы в базе данных для быстрого поиска
- Подготовленные SQL запросы (prepared statements)
- Кэширование статических файлов на frontend
- Минификация и сжатие в production build

### 8.2. Масштабируемость

Текущая архитектура подходит для:
- До 1000 терминалов
- До 100 одновременных пользователей
- База данных до 100MB

Для больших нагрузок рекомендуется:
- Миграция на PostgreSQL или MySQL
- Использование Redis для сессий
- Горизонтальное масштабирование (несколько инстансов)
- CDN для статических файлов

## 9. Мониторинг и логирование

### 9.1. Логирование

- Консольные логи для разработки
- Аудит действий в таблице `audit_logs`
- Логи ошибок через errorHandler middleware

### 9.2. Рекомендации для production

- Настроить централизованное логирование (ELK, Splunk)
- Мониторинг производительности (PM2, New Relic)
- Алерты на критические ошибки
- Мониторинг использования ресурсов

## 10. Дальнейшее развитие

### Планируемые улучшения:

1. **Интеграция с внешними системами**
   - API для интеграции с банковскими системами
   - Интеграция с системами мониторинга терминалов

2. **Расширенная аналитика**
   - Дашборды с графиками
   - Отчеты по терминалам
   - Статистика по локациям

3. **Мобильное приложение**
   - React Native приложение для мобильных устройств
   - Push-уведомления

4. **Улучшения безопасности**
   - OAuth2 интеграция
   - Расширенная система ролей и разрешений

---

**Версия документации:** 1.0  
**Дата создания:** 2024  
**Автор:** Команда разработки SST Site
