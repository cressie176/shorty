import { Hono } from 'hono';
import { MissingRedirectError } from '../domain/errors/index.js';
import type RedirectService from '../services/RedirectService.js';
import { MissingRedirect } from '../views/MissingRedirect.js';

export default function createRedirectBrowserRoutes({ redirectService }: { redirectService: RedirectService }) {
  const app = new Hono();

  app.get('/:key', async (c) => {
    try {
      const key = c.req.param('key');
      const redirect = await redirectService.getRedirect(key);

      return c.redirect(redirect.url, 301);
    } catch (err) {
      if (err instanceof MissingRedirectError) return c.html(<MissingRedirect message={err.message} />, 404);
      throw err;
    }
  });

  return app;
}
