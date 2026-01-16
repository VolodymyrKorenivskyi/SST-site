import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Middleware для валідації запитів з використанням Zod схем
 */
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Валідація body
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Ошибка валидации данных',
            details: errors,
          },
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Ошибка валидации данных',
        },
      });
    }
  };
}
