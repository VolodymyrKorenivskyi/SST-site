import { Request, Response, NextFunction } from 'express';

/**
 * Middleware для обробки помилок
 */
export function errorHandler(
  err: Error | any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('❌ Error Handler:', {
    message: err.message,
    code: err.code,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Якщо помилка вже оброблена
  if (res.headersSent) {
    return next(err);
  }

  // Відомі коди помилок
  const errorCodes: Record<string, number> = {
    EMAIL_ALREADY_EXISTS: 409,
    INVALID_CREDENTIALS: 401,
    ACCOUNT_BLOCKED: 403,
    EMAIL_NOT_VERIFIED: 403,
    INVALID_CODE: 400,
    CODE_EXPIRED: 400,
    WEAK_PASSWORD: 400,
    '2FA_REQUIRED': 403,
    INVALID_2FA_CODE: 401,
    INVALID_TEMP_TOKEN: 400,
    INSUFFICIENT_PERMISSIONS: 403,
    USER_NOT_FOUND: 404,
    RATE_LIMIT_EXCEEDED: 429,
    PASSWORD_ROTATION_REQUIRED: 403,
    UNAUTHORIZED: 401,
    VALIDATION_ERROR: 400,
  };

  const errorCode = err.message || err.code || 'INTERNAL_ERROR';
  const statusCode = errorCodes[errorCode] || 500;

  const errorMessages: Record<string, string> = {
    EMAIL_ALREADY_EXISTS: 'Email уже используется',
    INVALID_CREDENTIALS: 'Неверный email или пароль',
    ACCOUNT_BLOCKED: 'Аккаунт заблокирован',
    EMAIL_NOT_VERIFIED: 'Email не подтвержден',
    INVALID_CODE: 'Неверный или истекший код',
    CODE_EXPIRED: 'Код истек',
    WEAK_PASSWORD: 'Пароль не соответствует требованиям',
    '2FA_REQUIRED': 'Требуется настройка 2FA',
    INVALID_2FA_CODE: 'Неверный код 2FA',
    INVALID_TEMP_TOKEN: 'Недействительный временный токен',
    INSUFFICIENT_PERMISSIONS: 'Недостаточно прав',
    USER_NOT_FOUND: 'Пользователь не найден',
    RATE_LIMIT_EXCEEDED: 'Превышен лимит запросов',
    PASSWORD_ROTATION_REQUIRED: 'Требуется смена пароля',
    UNAUTHORIZED: 'Требуется аутентификация',
    VALIDATION_ERROR: 'Ошибка валидации данных',
    INTERNAL_ERROR: 'Внутренняя ошибка сервера',
  };

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessages[errorCode] || 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
