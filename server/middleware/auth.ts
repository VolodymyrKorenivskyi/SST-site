import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

// Розширення Request для зберігання userId
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      sessionId?: string;
    }
  }
}

/**
 * Middleware для перевірки аутентифікації
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Отримання session ID з cookie або Authorization header
    const sessionId =
      req.cookies?.sessionId ||
      req.headers.authorization?.replace('Bearer ', '') ||
      req.headers['x-session-id'];

    // Діагностика
    console.log('🔍 Auth middleware - Session check:', {
      hasCookie: !!req.cookies?.sessionId,
      cookieValue: req.cookies?.sessionId ? '***' : undefined,
      hasAuthHeader: !!req.headers.authorization,
      hasXSessionId: !!req.headers['x-session-id'],
      finalSessionId: sessionId ? '***' : undefined,
    });

    if (!sessionId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Требуется аутентификация',
        },
      });
      return;
    }

    // Перевірка сесії
    const session = AuthService.verifySession(sessionId as string);
    if (!session.valid || !session.userId) {
      console.log('❌ Session invalid:', { valid: session.valid, userId: session.userId });
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Недействительная сессия',
        },
      });
      return;
    }
    
    console.log('✅ Session valid, userId:', session.userId);

    // Збереження userId в request
    req.userId = session.userId;
    req.sessionId = sessionId as string;

    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    const errorResponse: any = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Внутренняя ошибка сервера',
      },
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error.details = error.message;
    }
    
    res.status(500).json(errorResponse);
  }
}

/**
 * Опціональна аутентифікація (якщо є токен - перевіряємо, якщо ні - пропускаємо)
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const sessionId =
      req.cookies?.sessionId ||
      req.headers.authorization?.replace('Bearer ', '') ||
      req.headers['x-session-id'];

    if (sessionId) {
      const session = AuthService.verifySession(sessionId as string);
      if (session.valid && session.userId) {
        req.userId = session.userId;
        req.sessionId = sessionId as string;
      }
    }

    next();
  } catch (error) {
    // У випадку помилки просто пропускаємо
    next();
  }
}
