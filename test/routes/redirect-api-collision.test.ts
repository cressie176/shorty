import { equal as eq } from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import Application from '../../src/infra/Application.js';
import Configuration from '../../src/infra/Configuration.js';
import { logger } from '../../src/infra/Logger.js';
import WebServer from '../../src/infra/WebServer.js';
import initLogging from '../../src/init/init-logging.js';
import RedirectService from '../../src/services/RedirectService.js';
import TestClient from '../../test-src/TestClient.js';
import TestPostgres from '../../test-src/TestPostgres.js';

describe('Redirect API Collision Handling', () => {
  let application: Application;
  let postgres: TestPostgres;
  let client: TestClient;
  let config: any;

  before(async () => {
    config = Configuration.load(['config/default.json', 'config/local.json', 'config/test.json']);

    await initLogging(config.logging);

    postgres = new TestPostgres({ config: config.postgres });
    const collisionConfig = { key: { alphabet: 'A', length: 1 } };
    const redirectService = new RedirectService({ config: collisionConfig, postgres });
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

  it('returns 409 when key collision occurs', async () => {
    await client.createRedirect('https://example.com/first');

    const { status, body } = await logger.suppress(() => client.createRedirect('https://example.com/second'));

    eq(status, 409);
    eq(body.code, 'KEY_COLLISION');
    eq(body.message, "Key collision 'A'");
  });
});
