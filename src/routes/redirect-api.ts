import { Hono } from 'hono';
import type RedirectService from '../services/RedirectService.js';

export default function createRedirectRoutes({ redirectService }: { redirectService: RedirectService }) {
  const app = new Hono();

  app.post('/', async (c) => {
    const { url } = await c.req.json();

    const redirect = await redirectService.saveRedirect(url);

    return c.json(redirect.toJSON(), 201);
  });

  app.get('/:key', async (c) => {
    const key = c.req.param('key');

    const redirect = await redirectService.getRedirect(key);

    return c.json(redirect.toJSON());
  });

  return app;
}
