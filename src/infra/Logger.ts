import { AsyncLocalStorage } from 'node:async_hooks';
import { Events as ApplicationEvents } from './Application.js';

export enum LogLevel {
  TRACE = 'TRACE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

const asyncLocalStorage = new AsyncLocalStorage<Record<string, any>>();
let suppressed = false;

export const logger = {
  trace: (message: string, context?: any): void => {
    log(LogLevel.TRACE, message, context);
  },
  debug: (message: string, context?: any): void => {
    log(LogLevel.DEBUG, message, context);
  },
  info: (message: string, context?: any): void => {
    log(LogLevel.INFO, message, context);
  },
  warn: (message: string, context?: any): void => {
    log(LogLevel.WARN, message, context);
  },
  error: (message: string, context?: any): void => {
    log(LogLevel.ERROR, message, context);
  },
  fatal: (message: string, context?: any): void => {
    log(LogLevel.FATAL, message, context);
  },
  withContext: <T>(context: Record<string, any>, fn: () => T): T => {
    return asyncLocalStorage.run(context, fn);
  },
  suppress: async <T>(fn: () => T | Promise<T>): Promise<T> => {
    suppressed = true;
    try {
      return await fn();
    } finally {
      suppressed = false;
    }
  },
};

function log(level: LogLevel, message: string, context: any = {}): void {
  if (suppressed) return;
  const store = asyncLocalStorage.getStore() || {};
  (process as any).emit(ApplicationEvents.LOG, { level, message, context: { ...store, ...context } });
}
