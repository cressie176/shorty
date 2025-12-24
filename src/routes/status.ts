import { Hono } from 'hono';
import { ServiceUnavailableError } from '../errors/index.js';
import type Database from '../infra/Database.js';

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
