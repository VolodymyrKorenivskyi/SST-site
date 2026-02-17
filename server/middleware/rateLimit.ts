import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Отримання IP адреси клієнта
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Rate limiting для входу
 * 5 спроб на 15 хвилин (в розробці: 50 спроб на 1 хвилину)
 */
export const loginRateLimit = rateLimit({
  windowMs: process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 60 * 1000, // 15 хвилин або 1 хвилина в розробці
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 5 спроб або 50 в розробці
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Слишком много попыток входа. Попробуйте через 15 минут.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientIp(req),
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Слишком много попыток входа. Попробуйте через 15 минут.',
      },
    });
  },
});

/**
 * Rate limiting для реєстрації
 * 3 реєстрації на годину
 */
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 година
  max: 3,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Слишком много попыток регистрации. Попробуйте через час.',
    },
  },
  keyGenerator: (req: Request) => getClientIp(req),
});

/**
 * Rate limiting для повторної відправки коду
 * 1 запит на хвилину (в розробці: 10 запитів на хвилину)
 */
export const resendCodeRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 хвилина
  max: process.env.NODE_ENV === 'production' ? 1 : 10, // 1 або 10 в розробці
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Повторная отправка кода доступна не чаще одного раза в минуту.',
    },
  },
  keyGenerator: (req: Request) => getClientIp(req),
});

/**
 * Rate limiting для відновлення пароля
 * 3 запити на 15 хвилин
 */
export const forgotPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Слишком много запросов на восстановление пароля.',
    },
  },
  keyGenerator: (req: Request) => getClientIp(req),
});

/**
 * Загальний rate limiting для всіх API
 * 100 запитів на хвилину
 */
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 хвилина
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Слишком много запросов. Попробуйте позже.',
    },
  },
  keyGenerator: (req: Request) => getClientIp(req),
});
