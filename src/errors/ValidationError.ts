import { ApplicationError } from './ApplicationError.js';

export class ValidationError extends ApplicationError {
  constructor({ message, cause }: { message: string; cause?: Error }) {
    super({ message, status: 400, code: 'VALIDATION_ERROR', cause });
  }
}
