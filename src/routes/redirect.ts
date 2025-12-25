import { Hono } from 'hono';
import CanonicalUrl from '../domain/CanonicalUrl.js';
import ShortKey from '../domain/ShortKey.js';

export default function createRedirectRoutes() {
  const app = new Hono();

  app.post('/redirect', async (c) => {
    const { url } = await c.req.json();

    const canonicalUrl = new CanonicalUrl(url);
    const shortKey = new ShortKey();

    return c.json(
      {
        key: shortKey.toString(),
        url: canonicalUrl.toString(),
      },
      201,
    );
  });

  return app;
}
