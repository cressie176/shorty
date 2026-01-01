import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { HealthCheckError, ValidationError } from '../domain/errors/index.js';
import { logger } from '../infra/Logger.js';

export function errorHandler(err: Error & { code?: string }, c: Context) {
  logger.error(err.message, { err });

  const status = getStatusCode(err.code);
  const message = status === 500 ? 'Internal Server Error' : err.message;
  return c.json({ message, code: err.code }, status as ContentfulStatusCode);
}

function getStatusCode(code: string | undefined): number {
  switch (code) {
    case ValidationError.code:
      return 400;
    case HealthCheckError.code:
      return 503;
    default:
      return 500;
  }
}
