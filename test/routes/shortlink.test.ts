import { equal as eq } from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import Application from '../../src/infra/Application.js';
import Configuration from '../../src/infra/Configuration.js';
import WebServer from '../../src/infra/WebServer.js';
import initLogging from '../../src/init/init-logging.js';
import KeyGenerator from '../../src/services/KeyGenerator.js';
import RedirectCleanupService from '../../src/services/RedirectCleanupService.js';
import RedirectService from '../../src/services/RedirectService.js';
import UrlValidator from '../../src/services/UrlValidator.js';
import TestClient from '../../test-src/TestClient.js';
import TestPostgres from '../../test-src/TestPostgres.js';

describe('Shortlink Routes', () => {
  let application: Application;
  let client: TestClient;
  let postgres: TestPostgres;

  before(async () => {
    const config = Configuration.load(['config/default.json', 'config/local.json', 'config/test.json']);

    await initLogging(config.logging);

    postgres = new TestPostgres({ config: config.postgres });
    const urlValidator = new UrlValidator();
    const keyGenerator = new KeyGenerator();
    const redirectService = new RedirectService({ postgres, urlValidator, keyGenerator, expiryDays: 90 });
    const server = new WebServer({ config: config.server, postgres, redirectService });
    const cleanupService = new RedirectCleanupService({ postgres, expiryDays: 90 });

    application = new Application({ postgres, server, cleanupService });
    await application.start();

    client = new TestClient(`http://localhost:${config.server.port}`);
  });

  afterEach(async () => {
    await postgres.nuke();
  });

  after(async () => {
    await application.stop();
  });

  describe('GET /r/:key', () => {
    it('redirects to URL with 301 status', async () => {
      const { body: createBody } = await client.post('/api/redirect', {
        url: 'https://example.com/path',
      });

      const response = await fetch(`http://localhost:3001/r/${createBody.key}`, {
        redirect: 'manual',
      });

      eq(response.status, 301);
      eq(response.headers.get('location'), 'https://example.com/path');
    });

    it('returns HTML 404 page for missing redirect', async () => {
      const response = await fetch('http://localhost:3001/r/nonexistent', {
        redirect: 'manual',
      });

      eq(response.status, 404);
      eq(response.headers.get('content-type'), 'text/html; charset=UTF-8');

      const html = await response.text();
      eq(html.includes('<h1>Missing Redirect</h1>'), true);
      eq(html.includes("The redirect for 'nonexistent' is missing"), true);
    });

    it('returns 404 for expired redirect', async () => {
      // Create a redirect with an old accessed_at date
      await postgres.withClient(async (client) => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 91); // 91 days ago (expired with 90 day expiry)
        await client.query("INSERT INTO redirects (key, url, created_at, accessed_at) VALUES ('expiredkey', 'https://example.com', $1::timestamptz, $1::timestamptz)", [pastDate.toISOString()]);
      });

      const response = await fetch('http://localhost:3001/r/expiredkey', {
        redirect: 'manual',
      });

      eq(response.status, 404);
      eq(response.headers.get('content-type'), 'text/html; charset=UTF-8');

      const html = await response.text();
      eq(html.includes('<h1>Missing Redirect</h1>'), true);
      eq(html.includes("The redirect for 'expiredkey' is missing"), true);
    });
  });
});
