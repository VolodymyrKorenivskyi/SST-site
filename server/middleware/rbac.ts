import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../database/connection';

const db = getDatabase();

/**
 * Middleware для перевірки ролей (Role-Based Access Control)
 */
export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Требуется аутентификация',
          },
        });
        return;
      }

      // Отримання ролей користувача
      const userRoles = db
        .prepare(`
          SELECT r.name FROM roles r
          JOIN user_roles ur ON r.id = ur.role_id
          WHERE ur.user_id = ?
        `)
        .all(req.userId) as { name: string }[];

      const roleNames = userRoles.map((r) => r.name);

      // Перевірка наявності хоча б однієї з дозволених ролей
      const hasAccess = roleNames.some((role) => allowedRoles.includes(role));

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Недостаточно прав доступа',
          },
        });
        return;
      }

      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Внутренняя ошибка сервера',
        },
      });
    }
  };
}

/**
 * Middleware для перевірки, що користувач є Administrator
 */
export const requireAdmin = requireRole('Administrator', 'Director');

/**
 * Middleware для перевірки, що користувач є Director
 */
export const requireDirector = requireRole('Director');
