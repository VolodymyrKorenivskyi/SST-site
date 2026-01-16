import express, { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import { getDatabase } from '../database/connection';
import { TwoFactorService } from '../services/TwoFactorService';
import { AuditService } from '../services/AuditService';
import { comparePassword } from '../utils/crypto';
import { errorHandler } from '../middleware/errorHandler';

const router = express.Router();
const db = getDatabase();

const verify2FASchema = z.object({
  code: z.string().length(6, 'Код должен содержать 6 цифр').regex(/^\d{6}$/, 'Код должен содержать только цифры'),
});

const disable2FASchema = z.object({
  password: z.string().min(1, 'Пароль обязателен'),
});

/**
 * POST /api/2fa/enable
 * Включення 2FA (крок 1 - отримання QR-коду)
 */
router.post('/enable', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Отримання користувача
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string };
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Генерація 2FA setup
    const setup = await TwoFactorService.generate2FASetup(user.email);

    // Збереження секрету в БД (тимчасово, до верифікації)
    db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(setup.secret, userId);

    res.json({
      success: true,
      data: {
        qrCodeUrl: setup.qrCodeUrl,
        secret: setup.secret,
        otpauthUrl: setup.otpauthUrl,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/2fa/verify-enable
 * Включення 2FA (крок 2 - верифікація)
 */
router.post(
  '/verify-enable',
  requireAuth,
  validate(verify2FASchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { code } = req.body;

      // Отримання користувача з секретом
      const user = db.prepare('SELECT totp_secret FROM users WHERE id = ?').get(userId) as {
        totp_secret: string | null;
      };
      if (!user || !user.totp_secret) {
        throw new Error('USER_NOT_FOUND');
      }

      // Перевірка TOTP коду
      const isValid = TwoFactorService.verifyToken(user.totp_secret, code);
      if (!isValid) {
        throw new Error('INVALID_2FA_CODE');
      }

      // Активування 2FA
      db.prepare('UPDATE users SET is_2fa_enabled = 1 WHERE id = ?').run(userId);

      // Логування
      AuditService.log({
        userId,
        action: '2fa_enabled',
      });

      res.json({
        success: true,
        message: '2FA включена',
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /api/2fa/disable
 * Вимкнення 2FA
 */
router.post(
  '/disable',
  requireAuth,
  validate(disable2FASchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { password } = req.body;

      // Отримання користувача та ролей
      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as {
        password_hash: string;
      };
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Отримання ролей
      const roles = db
        .prepare(`
          SELECT r.name FROM roles r
          JOIN user_roles ur ON r.id = ur.role_id
          WHERE ur.user_id = ?
        `)
        .all(userId) as { name: string }[];

      const roleNames = roles.map((r) => r.name);

      // Перевірка ролі - якщо не Guest, забороняємо вимкнення
      const hasNonGuestRole = roleNames.some((role) => role !== 'Guest');
      if (hasNonGuestRole) {
        throw new Error('2FA_REQUIRED'); // Використовуємо той самий код помилки
      }

      // Перевірка пароля
      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // Вимкнення 2FA
      db.prepare('UPDATE users SET is_2fa_enabled = 0, totp_secret = NULL WHERE id = ?').run(userId);

      // Логування
      AuditService.log({
        userId,
        action: '2fa_disabled',
      });

      res.json({
        success: true,
        message: '2FA отключена',
      });
    } catch (error: any) {
      next(error);
    }
  }
);

router.use(errorHandler);

export default router;
