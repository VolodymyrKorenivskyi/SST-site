import express, { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import { RoleRequestService } from '../services/RoleRequestService';
import { errorHandler } from '../middleware/errorHandler';

const router = express.Router();

const createRequestSchema = z.object({
  requestedRoleId: z.number().int().positive(),
  message: z.string().optional(),
});

const reviewRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  message: z.string().optional(),
});

/**
 * POST /api/role-requests
 * Створення заявки на роль
 */
router.post(
  '/',
  requireAuth,
  validate(createRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { requestedRoleId, message } = req.body;

      // Перевірка що не запитує роль Guest (вона вже є)
      if (requestedRoleId === 1) {
        throw new Error('CANNOT_REQUEST_GUEST_ROLE');
      }

      const request = RoleRequestService.createRequest({
        userId,
        requestedRoleId,
        message,
      });

      res.status(201).json({
        success: true,
        message: 'Заявка на роль создана',
        data: request,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * GET /api/role-requests/my
 * Отримання своїх заявок
 */
router.get('/my', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const requests = RoleRequestService.getUserRequests(userId);

    res.json({
      success: true,
      data: { requests },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/role-requests
 * Отримання всіх заявок (тільки для адміна)
 */
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined;
    const requests = RoleRequestService.getAllRequests(status);

    // Додавання інформації про користувачів та ролі
    const { getDatabase } = require('../database/connection');
    const db = getDatabase();

    const requestsWithDetails = requests.map((req: any) => {
      const user = db.prepare('SELECT id, email, first_name, last_name FROM users WHERE id = ?').get(req.user_id) as {
        id: number;
        email: string;
        first_name: string;
        last_name: string;
      };
      const role = db.prepare('SELECT id, name FROM roles WHERE id = ?').get(req.requested_role_id) as {
        id: number;
        name: string;
      };
      const reviewer = req.reviewed_by
        ? (db.prepare('SELECT id, email, first_name, last_name FROM users WHERE id = ?').get(req.reviewed_by) as {
            id: number;
            email: string;
            first_name: string;
            last_name: string;
          })
        : null;

      return {
        id: req.id,
        userId: req.user_id,
        requestedRoleId: req.requested_role_id,
        status: req.status,
        message: req.message,
        createdAt: req.created_at,
        reviewedAt: req.reviewed_at,
        reviewedBy: req.reviewed_by,
        user: user
          ? {
              id: user.id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
            }
          : null,
        requestedRole: role
          ? {
              id: role.id,
              name: role.name,
            }
          : null,
        reviewer: reviewer
          ? {
              id: reviewer.id,
              email: reviewer.email,
              firstName: reviewer.first_name,
              lastName: reviewer.last_name,
            }
          : null,
      };
    });

    res.json({
      success: true,
      data: { requests: requestsWithDetails },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/role-requests/count
 * Отримання кількості заявок за статусом (тільки для адміна)
 */
router.get('/count', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined;
    const requests = RoleRequestService.getAllRequests(status);
    
    res.json({
      success: true,
      data: {
        count: requests.length,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/role-requests/:id/review
 * Розгляд заявки (схвалення/відхилення) - тільки для адміна
 */
router.post(
  '/:id/review',
  requireAuth,
  requireAdmin,
  validate(reviewRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestId = parseInt(req.params.id);
      const reviewerId = req.userId!;
      const { status, message } = req.body;

      RoleRequestService.reviewRequest({
        requestId,
        reviewerId,
        status,
        message,
      });

      res.json({
        success: true,
        message: `Заявка ${status === 'approved' ? 'схвалена' : 'відхилена'}`,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

router.use(errorHandler);

export default router;
