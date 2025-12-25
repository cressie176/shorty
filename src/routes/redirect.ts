import { Hono } from 'hono';
import CanonicalUrl from '../domain/CanonicalUrl.js';
import ShortKey from '../domain/ShortKey.js';
import { NotFoundError } from '../errors/index.js';
import type RedirectService from '../services/RedirectService.js';

export default function createRedirectRoutes({ redirectService }: { redirectService: RedirectService }) {
  const app = new Hono();

  app.post('/redirect', async (c) => {
    const { url } = await c.req.json();
    const canonicalUrl = new CanonicalUrl(url);
    const redirect = await redirectService.storeRedirect(canonicalUrl);
    return c.json(redirect, 201);
  });

  app.get('/redirect/:key', async (c) => {
    const key = new ShortKey(c.req.param('key'));
    const redirect = await redirectService.getRedirect(key);
    if (!redirect) throw new NotFoundError({ message: `Redirect for '${key}' not found` });
    return c.json(redirect);
  });

  app.get('/r/:key', async (c) => {
    const key = new ShortKey(c.req.param('key'));
    const redirect = await redirectService.getRedirect(key);
    if (!redirect) throw new NotFoundError({ message: `Redirect for '${key}' not found` });
    return c.redirect(redirect.getUrl().toString());
  });

  return app;
}
