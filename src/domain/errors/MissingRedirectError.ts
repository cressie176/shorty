import { ApplicationError } from './ApplicationError.js';

export default class MissingRedirectError extends ApplicationError {
  static readonly code = 'MISSING_REDIRECT';

  constructor(key: string) {
    super({ code: MissingRedirectError.code, message: `Redirect for '${key}' not found` });
  }
}
