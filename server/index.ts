import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initDatabase } from './database/connection';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ініціалізація бази даних
initDatabase();

// API маршрути
app.get('/api', (req, res) => {
  res.json({ 
    message: 'SST Site API',
    version: '1.0.0'
  });
});

// TODO: Додати API маршрути тут
// app.use('/api/terminals', terminalRoutes);
// app.use('/api/transactions', transactionRoutes);

// В продакшені обслуговуємо статичні файли фронтенду
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 API сервер запущено на порту ${PORT}`);
  console.log(`📡 CORS налаштовано для: ${CLIENT_URL}`);
});
