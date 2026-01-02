import { Hono } from 'hono';
import type RedirectService from '../services/RedirectService.js';

export default function createRedirectRoutes({ redirectService }: { redirectService: RedirectService }) {
  const app = new Hono();

  app.post('/', async (c) => {
    const body = await c.req.json();
    const { url } = body;

    const redirect = await redirectService.createRedirect(url);

    return c.json({ key: redirect.key, url: redirect.url }, 201);
  });

  return app;
}
