import { afterEach, before, describe, it } from 'node:test';
import Application from '../../src/infra/Application.js';
import Configuration from '../../src/infra/Configuration.js';
import WebServer from '../../src/infra/WebServer.js';
import initLogging from '../../src/init/init-logging.js';
import RedirectService from '../../src/services/RedirectService.js';
import TestPostgres from '../../test-src/TestPostgres.js';

describe('Application', () => {
  let application: Application;
  let server: WebServer;
  let postgres: TestPostgres;
  let config: any;

  before(async () => {
    config = Configuration.load(['config/default.json', 'config/local.json', 'config/test.json']);
    await initLogging(config.logging);

    postgres = new TestPostgres({ config: config.postgres });
    const redirectService = new RedirectService({ config: config.redirect, postgres });
    server = new WebServer({ config: config.server, postgres, redirectService });
    application = new Application({ server, postgres });
  });

  afterEach(async () => {
    await application.stop();
  });

  it('can be started', async () => {
    await application.start();
  });

  it('can be stopped after start', async () => {
    await application.start();
    await application.stop();
  });

  it('can be stopped without starting', async () => {
    await application.stop();
  });

  it('can be restarted', async () => {
    await application.start();
    await application.stop();
    await application.start();
  });

  it('tolerates stopping twice', async () => {
    await application.start();
    await application.stop();
    await application.stop();
  });

  it('tolerates starting twice without stopping', async () => {
    await application.start();
    await application.start();
  });
});
