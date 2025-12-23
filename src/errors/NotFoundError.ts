import { ApplicationError } from './ApplicationError.js';

export class NotFoundError extends ApplicationError {
  constructor({ message, cause }: { message: string; cause?: Error }) {
    super({ message, status: 404, code: 'NOT_FOUND', cause });
  }
}
