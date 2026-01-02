import { ApplicationError } from './ApplicationError.js';

export class HealthCheckError extends ApplicationError {
  static readonly code = 'HEALTH_CHECK_ERROR';

  constructor(message: string, cause?: Error) {
    super({ message, code: HealthCheckError.code, cause });
  }
}
