import { ApplicationError } from './ApplicationError.js';

export class ServiceUnavailableError extends ApplicationError {
  constructor({ message, cause }: { message: string; cause?: Error }) {
    super({ message, status: 503, code: 'SERVICE_UNAVAILABLE', cause });
  }
}
