import { equal as eq } from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import Application from '../../src/infra/Application.js';
import Configuration from '../../src/infra/Configuration.js';
import WebServer from '../../src/infra/WebServer.js';
import initLogging from '../../src/init/init-logging.js';
import initMigrations from '../../src/init/init-migrations.js';
import RedirectService from '../../src/services/RedirectService.js';
import TestClient from '../../test-src/TestClient.js';
import TestDatabase from '../../test-src/TestDatabase.js';

describe('Status Routes', () => {
  let application: Application;
  let database: TestDatabase;
  let client: TestClient;

  before(async () => {
    const config = Configuration.load(['config/default.json', 'config/local.json', 'config/test.json']);

    await initLogging(config.logging);
    await initMigrations(config.database);

    database = new TestDatabase({ config: config.database });
    const redirectService = new RedirectService({ config: config.redirect, database });
    const server = new WebServer({ config: config.server, database, redirectService });

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

  it('returns OK when database is healthy', async () => {
    const { status, body } = await client.getHealth();

    eq(status, 200);
    eq(body.message, 'OK');
  });
});
