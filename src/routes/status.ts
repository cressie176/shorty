import { Hono } from 'hono';
import type Database from '../infra/Database.js';
import { ServiceUnavailableError } from '../errors/index.js';

export default function createStatusRoutes(database: Database) {
  const app = new Hono();

  app.get('/health', async (c) => {
    try {
      await database.test();
      return c.json({ message: 'OK' });
    } catch (err) {
      throw new ServiceUnavailableError({ message: 'Service Unavailable', cause: err as Error });
    }
  });

  return app;
}
