import { ApplicationError } from './ApplicationError.js';

export class ValidationError extends ApplicationError {
  static readonly code = 'VALIDATION_ERROR';

  constructor(message: string, cause?: Error) {
    super({ message, code: ValidationError.code, cause });
  }
}
