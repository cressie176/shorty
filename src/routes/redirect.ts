import { Hono } from 'hono';
import CanonicalUrl from '../domain/CanonicalUrl.js';
import ShortKey from '../domain/ShortKey.js';
import { NotFoundError } from '../errors/index.js';
import type Database from '../infra/Database.js';
import UnitOfWork from '../infra/UnitOfWork.js';
import RedirectService from '../services/RedirectService.js';

export default function createRedirectRoutes({ database }: { database: Database }) {
  const app = new Hono();
  const redirectService = new RedirectService({ database });
  const unitOfWork = new UnitOfWork(database);

  app.post('/redirect', async (c) => {
    const { url } = await c.req.json();
    const canonicalUrl = new CanonicalUrl(url);

    const redirect = await unitOfWork.span('storeRedirect', async () => {
      return await redirectService.storeRedirect(canonicalUrl);
    });

    return c.json(redirect, 201);
  });

  app.get('/redirect/:key', async (c) => {
    const key = new ShortKey(c.req.param('key'));

    const redirect = await unitOfWork.span('getRedirect', async () => {
      return await redirectService.getRedirect(key);
    });

    if (!redirect) throw new NotFoundError({ message: `Redirect for '${key}' not found` });

    return c.json(redirect);
  });

  return app;
}
