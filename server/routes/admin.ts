import express, { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { getDatabase } from '../database/connection';
import { AuditService } from '../services/AuditService';
import { EmailService } from '../services/EmailService';
import { errorHandler } from '../middleware/errorHandler';
import { z } from 'zod';

const router = express.Router();
const db = getDatabase();

// Всі роути вимагають аутентифікації та ролі Administrator
router.use(requireAuth);
router.use(requireAdmin);

// Схеми валідації
const assignRoleSchema = z.object({
  roleId: z.number().int().positive(),
});

const blockUserSchema = z.object({
  reason: z.string().min(1),
  blockedUntil: z.string().optional(),
});

/**
 * GET /api/admin/users
 * Список всіх користувачів
 */
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const role = req.query.role as string;
    const status = req.query.status as string;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ` AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (role) {
      whereClause += ` AND id IN (
        SELECT user_id FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE r.name = ?
      )`;
      params.push(role);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // Підрахунок загальної кількості
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const total = (db.prepare(countQuery).get(...params) as { total: number }).total;

    // Отримання користувачів
    const usersQuery = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.status,
        u.is_email_verified, u.is_2fa_enabled, u.created_at, u.last_login_at
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const users = db.prepare(usersQuery).all(...params, limit, offset) as any[];

    // Отримання ролей для кожного користувача
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const roles = db
          .prepare(`
            SELECT r.name FROM roles r
            JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = ?
          `)
          .all(user.id) as { name: string }[];

        return {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          roles: roles.map((r) => r.name),
          status: user.status,
          isEmailVerified: !!user.is_email_verified,
          is2FAEnabled: !!user.is_2fa_enabled,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
        };
      })
    );

    res.json({
      success: true,
      data: {
        users: usersWithRoles,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/admin/users/:id
 * Детальна інформація про користувача
 */
router.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);

    // Отримання користувача
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Отримання ролей
    const roles = db
      .prepare(`
        SELECT r.* FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `)
      .all(userId) as any[];

    // Отримання сесій
    const sessions = db
      .prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY last_activity_at DESC LIMIT 10')
      .all(userId) as any[];

    // Останні дії
    const recentActivity = AuditService.getLogs({
      userId,
      limit: 10,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          middleName: user.middle_name,
          lastName: user.last_name,
          phone: user.phone,
          telegram: user.telegram,
          avatarUrl: user.avatar_url,
          companyName: user.company_name,
          jobTitle: user.job_title,
          timezone: user.timezone,
          country: user.country,
          language: user.language,
          status: user.status,
          isEmailVerified: !!user.is_email_verified,
          is2FAEnabled: !!user.is_2fa_enabled,
          failedLoginAttempts: user.failed_login_attempts,
          blockedUntil: user.blocked_until,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
        },
        roles: roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
        })),
        sessions: sessions.map((s) => ({
          id: s.id,
          createdAt: s.created_at,
          lastActivityAt: s.last_activity_at,
          ipAddress: s.ip_address,
          userAgent: s.user_agent,
        })),
        recentActivity: recentActivity.logs,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * PATCH /api/admin/users/:id
 * Оновлення даних користувача адміністратором
 */
router.patch('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    const {
      firstName,
      middleName,
      lastName,
      phone,
      telegram,
      companyName,
      jobTitle,
      timezone,
      country,
      language,
      status,
    } = req.body;

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
    if (telegram !== undefined) {
      updateFields.push('telegram = ?');
      updateValues.push(telegram || null);
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
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      res.json({
        success: true,
        message: 'Нет изменений',
        data: {},
      });
      return;
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(userId);

    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(updateQuery).run(...updateValues);

    // Логування
    const adminId = req.userId!;
    AuditService.log({
      userId: adminId,
      action: 'user_updated',
      entityType: 'user',
      entityId: userId,
      details: { updatedFields: updateFields },
    });

    // Отримання оновленого користувача
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    const roles = db
      .prepare(`
        SELECT r.id, r.name FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `)
      .all(userId) as { id: number; name: string }[];

    res.json({
      success: true,
      message: 'Дані користувача оновлено',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        middleName: updatedUser.middle_name,
        lastName: updatedUser.last_name,
        phone: updatedUser.phone,
        telegram: updatedUser.telegram,
        companyName: updatedUser.company_name,
        jobTitle: updatedUser.job_title,
        timezone: updatedUser.timezone,
        country: updatedUser.country,
        language: updatedUser.language,
        status: updatedUser.status,
        roles: roles.map((r) => r.name),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/admin/users/:id/assign-role
 * Назначення ролі користувачу
 */
router.post(
  '/users/:id/assign-role',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.id);
      const { roleId } = assignRoleSchema.parse(req.body);
      const adminId = req.userId!;

      // Перевірка наявності ролі
      const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId) as { name: string } | undefined;
      if (!role) {
        throw new Error('ROLE_NOT_FOUND');
      }

      // Перевірка чи вже є ця роль
      const existingRole = db
        .prepare('SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?')
        .get(userId, roleId);
      if (existingRole) {
        throw new Error('ROLE_ALREADY_ASSIGNED');
      }

      // Назначення ролі
      db.prepare('INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)').run(
        userId,
        roleId,
        adminId
      );

      // Логування
      AuditService.log({
        userId: adminId,
        action: 'role_assigned',
        entityType: 'user',
        entityId: userId,
        details: { roleName: role.name, assignedTo: userId },
      });

      // Відправка email користувачу
      const user = db.prepare('SELECT email, first_name FROM users WHERE id = ?').get(userId) as {
        email: string;
        first_name: string;
      };
      
      if (user) {
        EmailService.sendRoleAddedEmail(user.email, user.first_name, role.name).catch((error) => {
          console.error('Ошибка отправки email о назначении роли:', error);
        });
      }

      res.json({
        success: true,
        message: 'Роль назначена',
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * DELETE /api/admin/users/:id/remove-role
 * Видалення ролі у користувача
 */
router.delete('/users/:id/remove-role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    const { roleId } = assignRoleSchema.parse(req.body);
    const adminId = req.userId!;

    // Перевірка ролі
      const role = db.prepare('SELECT name FROM roles WHERE id = ?').get(roleId) as { name: string } | undefined;
    if (!role) {
      throw new Error('ROLE_NOT_FOUND');
    }

    // Перевірка що не видаляємо останню роль
    const userRoles = db
      .prepare('SELECT role_id FROM user_roles WHERE user_id = ?')
      .all(userId) as { role_id: number }[];

    if (userRoles.length <= 1) {
      throw new Error('CANNOT_REMOVE_LAST_ROLE');
    }

    // Видалення ролі
    db.prepare('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?').run(userId, roleId);

    // Логування
    AuditService.log({
      userId: adminId,
      action: 'role_removed',
      entityType: 'user',
      entityId: userId,
      details: { roleName: role.name, removedFrom: userId },
    });

    // Відправка email користувачу
    const user = db.prepare('SELECT email, first_name FROM users WHERE id = ?').get(userId) as {
      email: string;
      first_name: string;
    };
    
    if (user) {
      EmailService.sendRoleRemovedEmail(user.email, user.first_name, role.name).catch((error) => {
        console.error('Ошибка отправки email об удалении роли:', error);
      });
    }

    res.json({
      success: true,
      message: 'Роль удалена',
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/admin/users/:id/block
 * Блокування користувача
 */
router.post('/users/:id/block', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    const { reason, blockedUntil } = blockUserSchema.parse(req.body);
    const adminId = req.userId!;

    // Оновлення статусу
    const blockedUntilDate = blockedUntil ? new Date(blockedUntil).toISOString() : null;
    db.prepare(
      'UPDATE users SET status = ?, blocked_until = ? WHERE id = ?'
    ).run('blocked', blockedUntilDate, userId);

    // Видалення всіх сесій
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);

    // Логування
    AuditService.log({
      userId: adminId,
      action: 'user_blocked',
      entityType: 'user',
      entityId: userId,
      details: { reason, blockedUntil: blockedUntilDate },
    });

    // Відправка email
    const user = db.prepare('SELECT email, first_name FROM users WHERE id = ?').get(userId) as {
      email: string;
      first_name: string;
    };
    // TODO: Відправити email про блокування

    res.json({
      success: true,
      message: 'Пользователь заблокирован',
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/admin/users/:id/unblock
 * Розблокування користувача
 */
router.post('/users/:id/unblock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    const adminId = req.userId!;

    // Оновлення статусу
    db.prepare(
      'UPDATE users SET status = ?, blocked_until = NULL WHERE id = ?'
    ).run('active', userId);

    // Логування
    AuditService.log({
      userId: adminId,
      action: 'user_unblocked',
      entityType: 'user',
      entityId: userId,
    });

    // Відправка email
    const user = db.prepare('SELECT email, first_name FROM users WHERE id = ?').get(userId) as {
      email: string;
      first_name: string;
    };
    // TODO: Відправити email про розблокування

    res.json({
      success: true,
      message: 'Пользователь разблокирован',
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * DELETE /api/admin/users/:id
 * Видалення користувача
 */
router.delete('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    const permanent = req.query.permanent === 'true';
    const adminId = req.userId!;

    if (permanent) {
      // Hard delete
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      AuditService.log({
        userId: adminId,
        action: 'user_deleted',
        entityType: 'user',
        entityId: userId,
        details: { softDelete: false },
      });
    } else {
      // Soft delete
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run('deleted', userId);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
      AuditService.log({
        userId: adminId,
        action: 'user_deleted',
        entityType: 'user',
        entityId: userId,
        details: { softDelete: true },
      });
    }

    res.json({
      success: true,
      message: 'Пользователь удален',
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * DELETE /api/admin/audit-logs
 * Видалення всіх логів аудиту
 */
router.delete('/audit-logs', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = req.userId!;

    // Видалення всіх логів
    AuditService.deleteAllLogs();

    // Логування дії видалення (перед видаленням)
    // Зауважте: це не буде записано в базу, тому що ми видаляємо всі логи
    // Але це нормально, бо ми вже видалили всі логи

    res.json({
      success: true,
      message: 'Все логи аудита удалены',
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/admin/audit-logs
 * Просмотр логів аудиту
 */
router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const action = req.query.action as string;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const result = AuditService.getLogs({
      page,
      limit,
      userId,
      action,
      dateFrom,
      dateTo,
    });

    // Додавання імен користувачів та форматування дат
    const logsWithNames = result.logs.map((log: any) => {
      const formattedLog: any = {
        id: log.id,
        userId: log.user_id || log.userId || null,
        action: log.action,
        entityType: log.entity_type || log.entityType || null,
        entityId: log.entity_id !== null ? log.entity_id : (log.entityId !== null ? log.entityId : null),
        details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details,
        ipAddress: log.ip_address || log.ipAddress || '',
        userAgent: log.user_agent || log.userAgent || '',
        createdAt: log.created_at || log.createdAt || null,
      };

      if (formattedLog.userId) {
        const user = db.prepare('SELECT first_name, last_name, email FROM users WHERE id = ?').get(formattedLog.userId) as {
          first_name: string;
          last_name: string;
          email: string;
        } | undefined;

        formattedLog.userName = user ? `${user.first_name} ${user.last_name}` : null;
        formattedLog.userEmail = user?.email || null;
      } else {
        formattedLog.userName = null;
        formattedLog.userEmail = null;
      }

      return formattedLog;
    });

    res.json({
      success: true,
      data: {
        logs: logsWithNames,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/admin/settings
 * Отримання всіх настройок
 */
router.get('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = db.prepare('SELECT * FROM app_settings ORDER BY key').all() as any[];

    res.json({
      success: true,
      data: {
        settings: settings.map((s) => ({
          key: s.key,
          value: s.value,
          description: s.description,
          valueType: s.value_type,
          updatedAt: s.updated_at,
        })),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * PATCH /api/admin/settings/:key
 * Оновлення настройки
 */
router.patch('/settings/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.params.key;
    const { value } = req.body;
    const adminId = req.userId!;

    // Оновлення настройки
    db.prepare(
      'UPDATE app_settings SET value = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE key = ?'
    ).run(value, adminId, key);

    // Логування
    const oldSetting = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as {
      value: string;
    };
    AuditService.log({
      userId: adminId,
      action: 'settings_changed',
      entityType: 'setting',
      entityId: null,
      details: { key, oldValue: oldSetting?.value, newValue: value },
    });

    res.json({
      success: true,
      message: 'Настройка обновлена',
    });
  } catch (error: any) {
    next(error);
  }
});

router.use(errorHandler);

export default router;
