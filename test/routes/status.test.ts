import { equal as eq } from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import Application from '../../src/infra/Application.js';
import Configuration from '../../src/infra/Configuration.js';
import WebServer from '../../src/infra/WebServer.js';
import initLogging from '../../src/init/init-logging.js';
import TestClient from '../../test-src/TestClient.js';
import TestPostgres from '../../test-src/TestPostgres.js';

describe('Status Routes', () => {
  let application: Application;
  let client: TestClient;

  before(async () => {
    const config = Configuration.load(['config/default.json', 'config/local.json', 'config/test.json']);

    await initLogging(config.logging);

    const postgres = new TestPostgres({ config: config.postgres });
    const server = new WebServer({ config: config.server, postgres });

    application = new Application({ server, postgres });
    await application.start();

    client = new TestClient(`http://localhost:${config.server.port}`);
  });

  after(async () => {
    await application.stop();
  });

  describe('health', () => {
    it('returns OK', async () => {
      const { status, body } = await client.getHealth();

      eq(status, 200);
      eq(body.message, 'OK');
    });
  });
});
