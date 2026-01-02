import { ApplicationError } from './ApplicationError.js';

export default class KeyCollisionError extends ApplicationError {
  static readonly code = 'KEY_COLLISION';

  constructor(key: string) {
    super({ code: KeyCollisionError.code, message: `Collision detected for key '${key}'` });
  }
}
