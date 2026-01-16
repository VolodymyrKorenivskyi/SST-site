import express, { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { changePasswordSchema } from '../utils/validation';
import { hashPassword, comparePassword } from '../utils/crypto';
import { getDatabase } from '../database/connection';
import { AuditService } from '../services/AuditService';
import { RoleRequestService } from '../services/RoleRequestService';
import { errorHandler } from '../middleware/errorHandler';

const router = express.Router();
const db = getDatabase();

/**
 * GET /api/users/me
 * Отримання власного профілю з ролями та статусом заявок
 */
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    console.log('📋 GET /api/users/me - userId:', userId);

    // Отримання користувача
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Отримання ролей
    const roles = db
      .prepare(`
        SELECT r.id, r.name FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `)
      .all(userId) as { id: number; name: string }[];

    const roleNames = roles.map((r) => r.name);
    const roleIds = roles.map((r) => r.id);
    
    console.log('📋 User roles:', { userId, roleNames, roleIds });

    // Перевірка чи є ролі крім Guest
    const hasApprovedRole = roleIds.some((id) => id !== 1);
    
    // Отримання активних заявок
    const requests = RoleRequestService.getUserRequests(userId);
    const pendingRequests = requests.filter((r) => r.status === 'pending');

    // Форматування відповіді (без пароля та інших чутливих даних)
    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      middleName: user.middle_name,
      lastName: user.last_name,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      companyName: user.company_name,
      jobTitle: user.job_title,
      timezone: user.timezone,
      country: user.country,
      language: user.language,
      is2FAEnabled: !!user.is_2fa_enabled,
      roles: roleNames,
      roleIds: roleIds,
      hasApprovedRole,
      pendingRequests: pendingRequests.map((r) => ({
        id: r.id,
        requestedRoleId: r.requestedRoleId,
        status: r.status,
        message: r.message,
        createdAt: r.createdAt,
      })),
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
    };

    // Відключаємо кешування для цього ендпоінту
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json({
      success: true,
      data: userResponse,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * PATCH /api/users/me
 * Оновлення власного профілю
 */
router.patch('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const {
      firstName,
      middleName,
      lastName,
      phone,
      companyName,
      jobTitle,
      timezone,
      country,
      language,
    } = req.body;

    // Оновлення полів (тільки ті, що передані)
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (firstName !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(firstName);
    }
    if (middleName !== undefined) {
      updateFields.push('middle_name = ?');
      updateValues.push(middleName || null);
    }
    if (lastName !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(lastName);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone || null);
    }
    if (companyName !== undefined) {
      updateFields.push('company_name = ?');
      updateValues.push(companyName || null);
    }
    if (jobTitle !== undefined) {
      updateFields.push('job_title = ?');
      updateValues.push(jobTitle || null);
    }
    if (timezone !== undefined) {
      updateFields.push('timezone = ?');
      updateValues.push(timezone);
    }
    if (country !== undefined) {
      updateFields.push('country = ?');
      updateValues.push(country || null);
    }
    if (language !== undefined) {
      updateFields.push('language = ?');
      updateValues.push(language);
    }

    if (updateFields.length === 0) {
      res.json({
        success: true,
        message: 'Нет изменений',
        data: {},
      });
      return;
    }

    // Додаємо updated_at
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(userId);

    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(updateQuery).run(...updateValues);

    // Отримання оновленого профілю
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    const roles = db
      .prepare(`
        SELECT r.id, r.name FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `)
      .all(userId) as { id: number; name: string }[];

    const roleNames = roles.map((r) => r.name);
    const roleIds = roles.map((r) => r.id);
    const hasApprovedRole = roleIds.some((id) => id !== 1);
    const requests = RoleRequestService.getUserRequests(userId);
    const pendingRequests = requests.filter((r) => r.status === 'pending');

    const userResponse = {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.first_name,
      middleName: updatedUser.middle_name,
      lastName: updatedUser.last_name,
      phone: updatedUser.phone,
      avatarUrl: updatedUser.avatar_url,
      companyName: updatedUser.company_name,
      jobTitle: updatedUser.job_title,
      timezone: updatedUser.timezone,
      country: updatedUser.country,
      language: updatedUser.language,
      is2FAEnabled: !!updatedUser.is_2fa_enabled,
      roles: roleNames,
      roleIds: roleIds,
      hasApprovedRole,
      pendingRequests: pendingRequests.map((r) => ({
        id: r.id,
        requestedRoleId: r.requestedRoleId,
        status: r.status,
        message: r.message,
        createdAt: r.createdAt,
      })),
      createdAt: updatedUser.created_at,
      lastLoginAt: updatedUser.last_login_at,
    };

    res.json({
      success: true,
      message: 'Профиль обновлен',
      data: userResponse,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/users/me/change-password
 * Зміна власного пароля
 */
router.post(
  '/me/change-password',
  requireAuth,
  validate(changePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { currentPassword, newPassword } = req.body;

      // Отримання користувача
      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as { password_hash: string };
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Перевірка поточного пароля
      const isValidPassword = await comparePassword(currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // Хешування нового пароля
      const passwordHash = await hashPassword(newPassword);

      // Оновлення пароля
      db.prepare(
        'UPDATE users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(passwordHash, userId);

      // Логування
      AuditService.log({
        userId,
        action: 'password_changed',
        details: { forced: false },
      });

      res.json({
        success: true,
        message: 'Пароль изменен',
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /api/users/me/avatar
 * Завантаження аватара
 */
router.post('/me/avatar', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Реалізувати завантаження файлів (multer або подібне)
    // Зараз повертаємо заглушку
    res.json({
      success: true,
      message: 'Аватар загружен (заглушка)',
      data: {
        avatarUrl: '/uploads/avatars/default.jpg',
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/users/roles
 * Отримання списку всіх доступних ролей (для подачі заявки)
 */
router.get('/roles', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = db.prepare('SELECT * FROM roles WHERE id != 1 ORDER BY id').all() as any[]; // Виключаємо Guest

    res.json({
      success: true,
      data: {
        roles: roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
        })),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/users/me/sessions
 * Отримання списку активних сесій користувача
 */
router.get('/me/sessions', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const currentSessionId = req.sessionId;

    // Отримання всіх активних сесій (які не закінчились)
    const sessions = db
      .prepare(`
        SELECT * FROM sessions 
        WHERE user_id = ? AND expires_at > datetime('now')
        ORDER BY last_activity_at DESC
      `)
      .all(userId) as any[];

    const sessionsList = sessions.map((session) => ({
      id: session.id,
      isCurrent: session.id === currentSessionId,
      userAgent: session.user_agent || 'Неизвестно',
      ipAddress: session.ip_address || 'Неизвестно',
      createdAt: session.created_at,
      lastActivityAt: session.last_activity_at,
      expiresAt: session.expires_at,
    }));

    res.json({
      success: true,
      data: {
        sessions: sessionsList,
        total: sessionsList.length,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * DELETE /api/users/me/sessions/:id
 * Видалення конкретної сесії
 */
router.delete('/me/sessions/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const sessionId = req.params.id;

    // Перевірка що сесія належить користувачу
    const session = db
      .prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?')
      .get(sessionId, userId) as any;

    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }

    // Не дозволяємо видаляти поточну сесію через цей endpoint (використовуємо logout)
    if (sessionId === req.sessionId) {
      throw new Error('CANNOT_DELETE_CURRENT_SESSION');
    }

    // Видалення сесії
    db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').run(sessionId, userId);

    // Логування
    AuditService.log({
      userId,
      action: 'session_deleted',
      details: { sessionId, deletedBy: 'user' },
    });

    res.json({
      success: true,
      message: 'Сессия удалена',
    });
  } catch (error: any) {
    next(error);
  }
});

router.use(errorHandler);

export default router;
