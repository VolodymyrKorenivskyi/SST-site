import express, { CookieOptions, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { EmailService } from '../services/EmailService';
import { generateVerificationCode } from '../utils/crypto';
import { normalizeEmail } from '../utils/crypto';
import { getDatabase } from '../database/connection';
import { requireAuth } from '../middleware/auth';
import {
  loginRateLimit,
  registerRateLimit,
  resendCodeRateLimit,
  forgotPasswordRateLimit,
} from '../middleware/rateLimit';
import { validate } from '../middleware/validation';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resetPasswordSchema,
  verify2FASchema,
} from '../utils/validation';
import { errorHandler } from '../middleware/errorHandler';
// cookie-parser не потрібен, використовуємо req.cookies напряму або express вбудований

const router = express.Router();
const db = getDatabase();

function buildSessionCookieOptions(req: Request): CookieOptions {
  const domain = process.env.COOKIE_DOMAIN?.trim() || undefined;
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 днів

  const envSameSite = process.env.COOKIE_SAMESITE?.trim().toLowerCase();
  const envSecure = process.env.COOKIE_SECURE?.trim().toLowerCase();

  let isCrossSite = false;
  const origin = req.headers.origin;
  if (origin) {
    try {
      const originHost = new URL(origin).hostname;
      isCrossSite = originHost !== req.hostname;
    } catch {
      // ignore invalid Origin
    }
  }

  const sameSite: CookieOptions['sameSite'] =
    envSameSite === 'none' ? 'none' : envSameSite === 'strict' ? 'strict' : envSameSite === 'lax' ? 'lax' : isCrossSite ? 'none' : 'lax';

  const secure =
    envSecure === 'true'
      ? true
      : envSecure === 'false'
        ? false
        : process.env.NODE_ENV === 'production' || sameSite === 'none';

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge,
    path: '/',
    ...(domain ? { domain } : {}),
  };
}

// Отримання IP та User Agent
function getRequestInfo(req: Request) {
  return {
    ipAddress:
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown',
    userAgent: req.headers['user-agent'] || undefined,
  };
}

/**
 * POST /api/auth/register
 * Реєстрація нового користувача
 */
router.post(
  '/register',
  registerRateLimit,
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestInfo = getRequestInfo(req);
      const result = await AuthService.register({
        ...req.body,
        ...requestInfo,
      });

      res.status(201).json({
        success: true,
        message: 'Пользователь создан. Проверьте email для подтверждения.',
        data: result,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/verify-email
 * Підтвердження email
 */
router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestInfo = getRequestInfo(req);
      AuthService.verifyEmail({
        ...req.body,
        ...requestInfo,
      });

      res.json({
        success: true,
        message: 'Email подтвержден',
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/resend-verification
 * Повторна відправка коду підтвердження
 */
router.post(
  '/resend-verification',
  resendCodeRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const normalizedEmail = normalizeEmail(email);

      const user = db.prepare('SELECT id, first_name, email FROM users WHERE email = ?').get(normalizedEmail) as {
        id: number;
        first_name: string;
        email: string;
      } | undefined;

      if (!user) {
        // З безпеки показуємо однакове повідомлення
        res.json({
          success: true,
          message: 'Код отправлен повторно',
        });
        return;
      }

      // Помічаємо старі коди як використані
      db.prepare('UPDATE verification_codes SET is_used = 1 WHERE user_id = ? AND type = ?').run(user.id, 'registration');

      // Генерація нового коду
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      db.prepare('INSERT INTO verification_codes (user_id, code, type, expires_at) VALUES (?, ?, ?, ?)').run(
        user.id,
        code,
        'registration',
        expiresAt.toISOString()
      );

      // Відправка email
      try {
        await EmailService.sendVerificationEmail(user.email, user.first_name, code);
        
        res.json({
          success: true,
          message: 'Код отправлен повторно',
        });
      } catch (error: any) {
        // Якщо SMTP не налаштований або помилка автентифікації - повертаємо код в response для розробки
        const isAuthError = error.code === 'EAUTH' || error.code === 'ECONNECTION' || error.message === 'SMTP_NOT_CONFIGURED' || error.message?.includes('SMTP_NOT_CONFIGURED');
        const isDevMode = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
        
        if (isAuthError || isDevMode) {
          console.error('⚠️  Ошибка отправки email, показываю код в response:', error.message);
          console.log('🔐 КОД ПОДТВЕРЖДЕНИЯ (для разработки):', code);
          res.json({
            success: true,
            message: 'Код отправлен повторно (SMTP не настроен или ошибка авторизации)',
            developmentCode: code, // Код для разработки - завжди повертаємо код
            error: isAuthError ? 'SMTP authentication failed. Please check your credentials.' : undefined,
          });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/login
 * Вхід в систему
 */
router.post(
  '/login',
  loginRateLimit,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🔐 Login attempt:', { email: req.body.email });
      const requestInfo = getRequestInfo(req);
      const result = await AuthService.login({
        ...req.body,
        ...requestInfo,
      });

      console.log('✅ Login successful:', { userId: result.user?.id, requires2FA: result.requires2FA });

      if (result.requires2FA) {
        res.json({
          success: true,
          requires2FA: true,
          message: 'Введите код из Google Authenticator',
          tempToken: result.tempToken,
        });
        return;
      }

      // Встановлення cookie з session ID
      res.cookie('sessionId', result.sessionId, buildSessionCookieOptions(req));
      
      console.log('🍪 Cookie set:', { sessionId: result.sessionId });

      res.json({
        success: true,
        message: 'Вход выполнен',
        data: {
          sessionId: result.sessionId,
          user: result.user,
        },
      });
    } catch (error: any) {
      console.error('❌ Login error:', error.message, error.stack);
      next(error);
    }
  }
);

/**
 * POST /api/auth/verify-2fa
 * Верифікація 2FA коду
 */
router.post(
  '/verify-2fa',
  validate(verify2FASchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestInfo = getRequestInfo(req);
      const result = await AuthService.verify2FA({
        ...req.body,
        ...requestInfo,
      });

      // Встановлення cookie
      res.cookie('sessionId', result.sessionId, buildSessionCookieOptions(req));
      
      console.log('🍪 Cookie set (2FA):', { sessionId: result.sessionId });

      res.json({
        success: true,
        message: 'Вход выполнен',
        data: {
          sessionId: result.sessionId,
          user: result.user,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/logout
 * Вихід з системи (тільки поточна сесія)
 */
router.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.sessionId && req.userId) {
      // Видалення тільки поточної сесії
      const { getDatabase } = require('../database/connection');
      const db = getDatabase();
      db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').run(req.sessionId, req.userId);

      // Логування
      const { AuditService } = require('../services/AuditService');
      AuditService.log({
        userId: req.userId,
        action: 'user_logout',
      });
    }

    // Видалення cookie
    res.clearCookie('sessionId', buildSessionCookieOptions(req));

    res.json({
      success: true,
      message: 'Выход выполнен',
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/auth/forgot-password
 * Запит відновлення пароля
 */
router.post(
  '/forgot-password',
  forgotPasswordRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const normalizedEmail = normalizeEmail(email);

      const user = db.prepare('SELECT id, first_name, email FROM users WHERE email = ?').get(normalizedEmail) as {
        id: number;
        first_name: string;
        email: string;
      } | undefined;

      // З безпеки показуємо однакове повідомлення
      if (!user) {
        res.json({
          success: true,
          message: 'Код для восстановления отправлен на email',
        });
        return;
      }

      // Помічаємо старі коди як використані
      db.prepare('UPDATE verification_codes SET is_used = 1 WHERE user_id = ? AND type = ?').run(user.id, 'password_reset');

      // Генерація коду
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      db.prepare('INSERT INTO verification_codes (user_id, code, type, expires_at) VALUES (?, ?, ?, ?)').run(
        user.id,
        code,
        'password_reset',
        expiresAt.toISOString()
      );

      // Відправка email
      await EmailService.sendPasswordResetEmail(user.email, user.first_name, code);

      // Логування
      const { AuditService } = require('../services/AuditService');
      AuditService.log({
        userId: user.id,
        action: 'password_reset_requested',
      });

      res.json({
        success: true,
        message: 'Код для восстановления отправлен на email',
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Сброс пароля з кодом
 */
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code, newPassword } = req.body;
      const normalizedEmail = normalizeEmail(email);

      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail) as { id: number } | undefined;
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Перевірка коду
      const codeRecord = db
        .prepare(`
          SELECT * FROM verification_codes
          WHERE user_id = ? AND code = ? AND type = 'password_reset' AND is_used = 0
          ORDER BY created_at DESC LIMIT 1
        `)
        .get(user.id, code) as any;

      if (!codeRecord) {
        throw new Error('INVALID_CODE');
      }

      if (new Date(codeRecord.expires_at) < new Date()) {
        throw new Error('CODE_EXPIRED');
      }

      // Зміна пароля
      const { hashPassword } = require('../utils/crypto');
      const passwordHash = await hashPassword(newPassword);

      db.prepare('UPDATE users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        passwordHash,
        user.id
      );

      // Позначення коду як використаного
      db.prepare('UPDATE verification_codes SET is_used = 1 WHERE id = ?').run(codeRecord.id);

      // Видалення всіх активних сесій
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

      // Логування
      const { AuditService } = require('../services/AuditService');
      AuditService.log({
        userId: user.id,
        action: 'password_changed',
        details: { forced: false },
      });

      res.json({
        success: true,
        message: 'Пароль успешно изменен',
      });
    } catch (error: any) {
      next(error);
    }
  }
);

// Підключення error handler
router.use(errorHandler);

export default router;
