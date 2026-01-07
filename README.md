# SST Site - Сайт для терміналів самообслуговування

Веб-сайт для управління терміналами самообслуговування, які приймають готівку та поповнюють карти чи рахунки.

## Архітектура

Проект використовує **клієнт-серверну архітектуру**:
- **Frontend**: React SPA з TypeScript та Vite
- **Backend**: Express.js REST API з TypeScript
- **База даних**: SQLite

## Технології

### Backend
- **TypeScript** - мова програмування
- **Express.js** - веб-фреймворк
- **SQLite** - база даних
- **better-sqlite3** - драйвер для SQLite

### Frontend
- **React 18** - UI бібліотека
- **TypeScript** - типізація
- **Vite** - збірщик та dev-сервер
- **React Router** - маршрутизація
- **Axios** - HTTP клієнт

## Структура проекту

```
SST-site/
├── server/                 # Backend
│   ├── index.ts           # Точка входу сервера
│   ├── database/          # Робота з БД
│   │   ├── connection.ts  # Підключення до БД
│   │   └── migrate.ts     # Міграції
│   ├── routes/            # API маршрути
│   ├── controllers/       # Контролери
│   ├── services/          # Бізнес-логіка
│   └── types/             # TypeScript типи
│
└── client/                # Frontend
    ├── src/
    │   ├── main.tsx       # Точка входу React
    │   ├── App.tsx        # Головний компонент
    │   ├── components/    # React компоненти
    │   ├── pages/         # Сторінки
    │   └── services/      # API сервіси
    ├── index.html
    └── vite.config.ts     # Конфігурація Vite
```

## Встановлення

Встановити залежності для обох частин проекту:

```bash
npm run install:all
```

Або окремо:

```bash
# Backend
npm install

# Frontend
cd client
npm install
```

## Розробка

Запустити одночасно frontend та backend:

```bash
npm run dev
```

Або окремо:

```bash
# Backend (порт 3000)
npm run dev:server

# Frontend (порт 5173)
npm run dev:client
```

Frontend автоматично проксує запити `/api/*` на backend сервер.

## Збірка

Зібрати обидві частини:

```bash
npm run build
```

Або окремо:

```bash
npm run build:server
npm run build:client
```

## Запуск продакшен версії

```bash
npm start
```

Backend автоматично обслуговує статичні файли фронтенду в продакшені.

## База даних

Міграції БД:
```bash
npm run db:migrate
```

## Порты

- **Backend API**: `http://localhost:3000`
- **Frontend**: `http://localhost:5173`
