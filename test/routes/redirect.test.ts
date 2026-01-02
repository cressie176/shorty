import { equal as eq } from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import Application from '../../src/infra/Application.js';
import Configuration from '../../src/infra/Configuration.js';
import WebServer from '../../src/infra/WebServer.js';
import initLogging from '../../src/init/init-logging.js';
import KeyGenerator from '../../src/services/KeyGenerator.js';
import RedirectService from '../../src/services/RedirectService.js';
import UrlValidator from '../../src/services/UrlValidator.js';
import TestClient from '../../test-src/TestClient.js';
import TestPostgres from '../../test-src/TestPostgres.js';

describe('Redirect Routes', () => {
  let application: Application;
  let client: TestClient;
  let postgres: TestPostgres;

  before(async () => {
    const config = Configuration.load(['config/default.json', 'config/local.json', 'config/test.json']);

    await initLogging(config.logging);

    postgres = new TestPostgres({ config: config.postgres });
    const urlValidator = new UrlValidator();
    const keyGenerator = new KeyGenerator();
    const redirectService = new RedirectService({ postgres, urlValidator, keyGenerator });
    const server = new WebServer({ config: config.server, postgres, redirectService });

    application = new Application({ postgres, server });
    await application.start();

    client = new TestClient(`http://localhost:${config.server.port}`);
  });

  afterEach(async () => {
    await postgres.nuke();
  });

  after(async () => {
    await application.stop();
  });

  describe('POST /api/redirect', () => {
    it('creates a redirect and returns key and normalised URL', async () => {
      const { status, body } = await client.post('/api/redirect', {
        url: 'https://example.com/path?z=1&a=2',
      });

      eq(status, 201);
      eq(body.key.length, 12);
      eq(body.url, 'https://example.com/path?a=2&z=1');
    });

    it('normalises URLs by converting to lowercase', async () => {
      const { status, body } = await client.post('/api/redirect', {
        url: 'HTTPS://EXAMPLE.COM/path',
      });

      eq(status, 201);
      eq(body.url, 'https://example.com/path');
    });

    it('normalises URLs by removing default HTTP port', async () => {
      const { status, body } = await client.post('/api/redirect', {
        url: 'http://example.com:80/path',
      });

      eq(status, 201);
      eq(body.url, 'http://example.com/path');
    });

    it('normalises URLs by removing default HTTPS port', async () => {
      const { status, body } = await client.post('/api/redirect', {
        url: 'https://example.com:443/path',
      });

      eq(status, 201);
      eq(body.url, 'https://example.com/path');
    });

    it('retains non-default ports', async () => {
      const { status, body } = await client.post('/api/redirect', {
        url: 'https://example.com:8443/path',
      });

      eq(status, 201);
      eq(body.url, 'https://example.com:8443/path');
    });

    it('retains hash', async () => {
      const { status, body } = await client.post('/api/redirect', {
        url: 'https://example.com/path#section',
      });

      eq(status, 201);
      eq(body.url, 'https://example.com/path#section');
    });

    it('retains trailing slash', async () => {
      const { status, body } = await client.post('/api/redirect', {
        url: 'https://example.com/path/',
      });

      eq(status, 201);
      eq(body.url, 'https://example.com/path/');
    });

    it('retains subdomain', async () => {
      const { status, body } = await client.post('/api/redirect', {
        url: 'https://sub.example.com/path',
      });

      eq(status, 201);
      eq(body.url, 'https://sub.example.com/path');
    });

    it('responds with 400 for invalid URL', async () => {
      const { status, body } = await client.post('/api/redirect', {
        url: 'not-a-valid-url',
      });

      eq(status, 400);
      eq(body.message, "Invalid URL: 'not-a-valid-url'");
      eq(body.code, 'VALIDATION_ERROR');
    });

    it('responds with 400 for URLs with authentication credentials', async () => {
      const { status, body } = await client.post('/api/redirect', {
        url: 'https://user:pass@example.com',
      });

      eq(status, 400);
      eq(body.code, 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/redirect/:key', () => {
    it('returns redirect for valid key', async () => {
      const { body: createBody } = await client.post('/api/redirect', {
        url: 'https://example.com/path',
      });

      const { status, body } = await client.get(`/api/redirect/${createBody.key}`);

      eq(status, 200);
      eq(body.key, createBody.key);
      eq(body.url, 'https://example.com/path');
    });

    it('responds with 404 for non-existent key', async () => {
      const { status, body } = await client.get('/api/redirect/nonexistent');

      eq(status, 404);
      eq(body.message, "Redirect for 'nonexistent' not found");
      eq(body.code, 'MISSING_REDIRECT');
    });
  });
});
