import { equal as eq, match, notEqual as neq } from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import Application from '../../src/infra/Application.js';
import Configuration from '../../src/infra/Configuration.js';
import { logger } from '../../src/infra/Logger.js';
import WebServer from '../../src/infra/WebServer.js';
import initLogging from '../../src/init/init-logging.js';
import initMigrations from '../../src/init/init-migrations.js';
import TestClient from '../../test-src/TestClient.js';
import TestDatabase from '../../test-src/TestDatabase.js';

describe('Redirect Routes', () => {
  let application: Application;
  let database: TestDatabase;
  let client: TestClient;

  before(async () => {
    const config = Configuration.load(['config/default.json', 'config/local.json', 'config/test.json']);

    await initLogging(config.logging);
    await initMigrations(config.database);

    database = new TestDatabase({ config: config.database });
    const server = new WebServer({ config: config.server, database });

    application = new Application({ database, server });
    await application.start();

    client = new TestClient(`http://localhost:${config.server.port}`);
  });

  beforeEach(async () => {
    await database.nuke();
  });

  after(async () => {
    await application.stop();
  });

  it('POST /redirect with valid URL returns 201 with key and url', async () => {
    const { status, body } = await client.shorten('https://example.com/path?z=1&a=2');

    eq(status, 201);
    eq(typeof body.key, 'string');
    eq(body.key.length > 0, true);
    eq(body.url, 'https://example.com/path?a=2&z=1');
  });

  it('canonical URL has sorted query parameters', async () => {
    const { body } = await client.shorten('https://example.com/test?zebra=1&apple=2&mango=3');

    eq(body.url, 'https://example.com/test?apple=2&mango=3&zebra=1');
  });

  it('key format is valid', async () => {
    const { body } = await client.shorten('https://example.com/path');

    match(body.key, /^[0-9bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ-]+$/);
    eq(body.key.length <= 12, true);
  });

  it('POST /redirect with invalid URL returns 400 ValidationError', async () => {
    const result = await logger.suppress(() => client.shorten('not a valid url'));

    eq(result.status, 400);
    eq(result.body.message, 'Invalid URL');
  });

  it('multiple requests generate different keys', async () => {
    const { body: body1 } = await client.shorten('https://example.com/first');
    const { body: body2 } = await client.shorten('https://example.com/second');

    neq(body1.key, body2.key);
  });

  it('GET /redirect/:key returns stored redirect', async () => {
    const { body: shortened } = await client.shorten('https://example.com/path?z=1&a=2');

    const { status, body } = await client.getRedirect(shortened.key);

    eq(status, 200);
    eq(body.key, shortened.key);
    eq(body.url, 'https://example.com/path?a=2&z=1');
  });

  it('GET /redirect/:key returns 404 for unknown key', async () => {
    const result = await logger.suppress(() => client.getRedirect('unknown-key'));

    eq(result.status, 404);
    eq(result.body.message, "Redirect for 'unknown-key' not found");
  });

  it('POST duplicate URL returns same key', async () => {
    const { body: first } = await client.shorten('https://example.com/duplicate');
    const { body: second } = await client.shorten('https://example.com/duplicate');

    eq(first.key, second.key);
    eq(first.url, second.url);
  });

  it('handles concurrent POST requests for same URL', async () => {
    const url = 'https://example.com/concurrent';

    const requests = Array.from({ length: 100 }, () => client.shorten(url));
    const results = await Promise.all(requests);

    const keys = results.map((r) => r.body.key);
    const uniqueKeys = new Set(keys);
    eq(uniqueKeys.size, 1);
  });
});
