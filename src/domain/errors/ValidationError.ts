import { ApplicationError } from './ApplicationError.js';

export default class ValidationError extends ApplicationError {
  static readonly code = 'VALIDATION_ERROR';

  constructor(message: string, cause?: Error) {
    super({ code: ValidationError.code, message, cause });
  }
}
