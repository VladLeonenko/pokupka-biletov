import { ZodError } from 'zod';

/**
 * Middleware для валидации запросов с помощью Zod схем
 * @param {Object} schemas - Объект с схемами для валидации { body?, query?, params? }
 * @returns {Function} Express middleware
 */
export function validate(schemas) {
  return (req, res, next) => {
    try {
      // Валидация body
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      // Валидация query parameters
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      // Валидация URL parameters
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Форматируем ошибки Zod в понятный вид
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          error: 'Ошибка валидации данных',
          details: formattedErrors,
        });
      }

      // Другие ошибки
      return res.status(500).json({
        error: 'Внутренняя ошибка сервера',
      });
    }
  };
}

/**
 * Middleware для безопасной валидации (не бросает ошибку, а возвращает результат)
 * @param {Object} schemas - Объект с схемами для валидации
 * @returns {Function} Express middleware
 */
export function validateSafe(schemas) {
  return (req, res, next) => {
    const results = {};

    // Валидация body
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (result.success) {
        req.body = result.data;
        results.body = { success: true };
      } else {
        results.body = { success: false, errors: result.error.errors };
      }
    }

    // Валидация query
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (result.success) {
        req.query = result.data;
        results.query = { success: true };
      } else {
        results.query = { success: false, errors: result.error.errors };
      }
    }

    // Валидация params
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (result.success) {
        req.params = result.data;
        results.params = { success: true };
      } else {
        results.params = { success: false, errors: result.error.errors };
      }
    }

    // Прикрепляем результаты валидации к request
    req.validationResults = results;

    // Проверяем, есть ли ошибки
    const hasErrors = Object.values(results).some(r => !r.success);
    if (hasErrors) {
      const allErrors = Object.entries(results)
        .filter(([, r]) => !r.success)
        .flatMap(([key, r]) =>
          r.errors.map(err => ({
            source: key,
            field: err.path.join('.'),
            message: err.message,
          }))
        );

      return res.status(400).json({
        error: 'Ошибка валидации данных',
        details: allErrors,
      });
    }

    next();
  };
}








