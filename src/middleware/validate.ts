import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';
import { AppError } from '../utils/errors';

type ValidationTarget = 'query' | 'params' | 'body';

/**
 * Validates req[target] against a Zod schema and stores the parsed
 * (defaulted/coerced) result on res.locals.validated for the route handler
 * to read. Deliberately doesn't reassign req.query/req.params — Express 5
 * exposes those as non-writable getters.
 */
export function validate(target: ValidationTarget, schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(new AppError(400, result.error.issues.map((issue) => issue.message).join(', ')));
      return;
    }
    res.locals.validated = result.data;
    next();
  };
}
