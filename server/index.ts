import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { initDatabase } from './database/connection';
import authRoutes from './routes/auth';
import { generalRateLimit } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Безпека
app.use(helmet({
  contentSecurityPolicy: false, // Відключаємо для розробки, в production налаштувати правильно
}));

// CORS
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
}));

// Парсинг
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api', generalRateLimit);

// Ініціалізація бази даних
initDatabase();

// API маршрути
app.get('/api', (req, res) => {
  res.json({ 
    message: 'SST Site API',
    version: '1.0.0'
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// User routes
import userRoutes from './routes/users';
app.use('/api/users', userRoutes);

// 2FA routes
import twoFARoutes from './routes/2fa';
app.use('/api/2fa', twoFARoutes);

// Admin routes
import adminRoutes from './routes/admin';
app.use('/api/admin', adminRoutes);

// Role requests routes
import roleRequestsRoutes from './routes/roleRequests';
app.use('/api/role-requests', roleRequestsRoutes);

// Terminals routes
import terminalsRoutes from './routes/terminals';
app.use('/api/terminals', terminalsRoutes);

// В продакшені обслуговуємо статичні файли фронтенду
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Error handler (в кінці)
app.use(errorHandler);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 API сервер запущено на порту ${PORT}`);
  console.log(`📡 CORS налаштовано для: ${CLIENT_URL}`);
});
