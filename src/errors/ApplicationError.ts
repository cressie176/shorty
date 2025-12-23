export interface ApplicationErrorParams {
  message: string;
  status: number;
  code: string;
  cause?: Error;
}

export class ApplicationError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly cause?: Error;

  constructor({ message, status, code, cause }: ApplicationErrorParams) {
    super(message);
    this.status = status;
    this.code = code;
    this.cause = cause;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  static wrap(err: Error): ApplicationError {
    if (err instanceof ApplicationError) return err;
    return new ApplicationError({ message: 'Internal server error', status: 500, code: 'INTERNAL_ERROR', cause: err });
  }
}
