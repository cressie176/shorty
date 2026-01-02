import { Hono } from 'hono';
import { HealthCheckError } from '../domain/errors/index.js';
import type Postgres from '../infra/Postgres.js';

export default function createStatusRoutes({ postgres }: { postgres: Postgres }) {
  const app = new Hono();

  app.get('/health', async (c) => {
    try {
      await Promise.all([postgres.test()]);
      return c.json({ message: 'OK' });
    } catch (err) {
      throw new HealthCheckError('Health check failed', err as Error);
    }
  });

  return app;
}
