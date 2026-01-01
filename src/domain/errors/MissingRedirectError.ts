import { ApplicationError } from './ApplicationError.js';

export class MissingRedirectError extends ApplicationError {
  static readonly code = 'MISSING_REDIRECT';

  constructor(message: string, cause?: Error) {
    super({ message, code: MissingRedirectError.code, cause });
  }
}
