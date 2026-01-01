export interface ApplicationErrorParams {
  message: string;
  code: string;
  cause?: Error;
}

export class ApplicationError extends Error {
  public readonly code: string;
  public readonly cause?: Error;

  constructor({ message, code, cause }: ApplicationErrorParams) {
    super(message);
    this.code = code;
    this.cause = cause;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
