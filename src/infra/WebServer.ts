import { type ServerType, serve } from '@hono/node-server';
import { Hono } from 'hono';
import { errorHandler } from '../middleware/ErrorHandler.js';
import createRedirectRoutes from '../routes/redirect.js';
import createShortlinkRoutes from '../routes/shortlink.js';
import createStatusRoutes from '../routes/status.js';
import type RedirectService from '../services/RedirectService.js';
import CommandQueue from './CommandQueue.js';
import { logger } from './Logger.js';
import type Postgres from './Postgres.js';

export interface WebServerConfig {
  host?: string;
  port: number;
}

export interface WebServerParams {
  config: WebServerConfig;
  postgres: Postgres;
  redirectService: RedirectService;
}

export default class WebServer {
  private server?: ServerType;
  private readonly app: Hono;
  private readonly config;
  private readonly commandQueue = new CommandQueue();
  private started = false;

  constructor({ config, postgres, redirectService }: WebServerParams) {
    this.config = Object.assign({ host: '0.0.0.0' }, config);
    this.app = new Hono();
    this.app.onError(errorHandler);
    this.app.route('/__', createStatusRoutes({ postgres }));
    this.app.route('/api/redirect', createRedirectRoutes({ redirectService }));
    this.app.route('/r', createShortlinkRoutes({ redirectService }));
  }

  getApp(): Hono {
    return this.app;
  }

  async start(): Promise<void> {
    return this.commandQueue.execute(async () => {
      if (this.started) return;
      logger.info('Starting server');
      const info = await this.startHono();
      this.started = true;
      logger.info('Server started', info);
    });
  }

  private async startHono() {
    return new Promise((resolve) => {
      this.server = serve(
        {
          fetch: this.app.fetch,
          port: this.config.port,
          hostname: this.config.host,
        },
        (info) => resolve(info),
      );
    });
  }

  async stop(): Promise<void> {
    return this.commandQueue.execute(async () => {
      if (!this.started) return;
      logger.info('Stopping server');
      await this.stopHono();
      this.started = false;
      logger.info('Server stopped');
    });
  }

  private async stopHono() {
    return new Promise<void>((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => resolve());
    });
  }
}
