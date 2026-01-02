import { Hono } from 'hono';
import { html } from 'hono/html';
import { MissingRedirectError } from '../domain/errors/index.js';
import type RedirectService from '../services/RedirectService.js';

export default function createShortlinkRoutes({ redirectService }: { redirectService: RedirectService }) {
  const app = new Hono();

  app.get('/:key', async (c) => {
    try {
      const key = c.req.param('key');
      const redirect = await redirectService.getRedirect(key);
      return c.redirect(redirect.url, 301);
    } catch (err) {
      if (err instanceof MissingRedirectError) {
        const key = c.req.param('key');
        return c.html(
          html`<!DOCTYPE html>
            <html lang="en">
              <head>
                <title>Shorty</title>
              </head>
              <body>
                <h1>Missing Redirect</h1>
                <div class="error message">The redirect for '${key}' is missing</div>
              </body>
            </html>`,
          404,
        );
      }
      throw err;
    }
  });

  return app;
}
