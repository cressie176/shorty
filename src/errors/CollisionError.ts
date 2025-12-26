import { ApplicationError } from './ApplicationError.js';

export class CollisionError extends ApplicationError {
  constructor({ message, cause }: { message: string; cause?: Error }) {
    super({ message, status: 409, code: 'KEY_COLLISION', cause });
  }
}
