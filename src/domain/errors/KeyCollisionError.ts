import { ApplicationError } from './ApplicationError.js';

export class KeyCollisionError extends ApplicationError {
  static readonly code = 'KEY_COLLISION';

  constructor(message: string, cause?: Error) {
    super({ message, code: KeyCollisionError.code, cause });
  }
}
