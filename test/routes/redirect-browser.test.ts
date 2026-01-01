import { equal as eq } from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import { load } from 'cheerio';
import Application from '../../src/infra/Application.js';
import Configuration from '../../src/infra/Configuration.js';
import { logger } from '../../src/infra/Logger.js';
import WebServer from '../../src/infra/WebServer.js';
import initLogging from '../../src/init/init-logging.js';
import RedirectService from '../../src/services/RedirectService.js';
import TestClient from '../../test-src/TestClient.js';
import TestPostgres from '../../test-src/TestPostgres.js';

describe('Redirect Browser Routes', () => {
  let application: Application;
  let postgres: TestPostgres;
  let client: TestClient;
  let config: any;

  before(async () => {
    config = Configuration.load(['config/default.json', 'config/local.json', 'config/test.json']);

    await initLogging(config.logging);

    postgres = new TestPostgres({ config: config.postgres });
    const redirectService = new RedirectService({ config: config.redirect, postgres });
    const server = new WebServer({ config: config.server, postgres, redirectService });

    application = new Application({ server, postgres });
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
      const created = await client.createRedirect('https://example.com/path?a=2&z=1');

      const { status, headers } = await client.followRedirect(created.body.key);

      eq(status, 301);
      eq(headers.get('Location'), 'https://example.com/path?a=2&z=1');
    });

    it('returns 404 HTML page for missing redirect', async () => {
      const { status, body } = await logger.suppress(() => client.followRedirect('nonexistent'));

      eq(status, 404);

      const $ = load(body);
      eq($('title').text(), 'Shorty');
      eq($('h1').text(), 'Missing Redirect');
      eq($('div.error.message').text(), "Redirect for 'nonexistent' not found");
    });
  });
});
