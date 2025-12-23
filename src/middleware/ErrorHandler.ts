import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ApplicationError } from '../errors/index.js';
import { logger } from '../infra/Logger.js';

export function errorHandler(err: Error, c: Context) {
  return applicationErrorHandler(ApplicationError.wrap(err), c);
}

function applicationErrorHandler(err: ApplicationError, c: Context) {
  logger.error(err.message, { err });
  return c.json({ message: err.message, code: err.code }, err.status as ContentfulStatusCode);
}
