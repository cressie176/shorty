import Application from './src/infra/Application.js';
import Configuration from './src/infra/Configuration.js';
import Postgres from './src/infra/Postgres.js';
import WebServer from './src/infra/WebServer.js';
import initLogging from './src/init/init-logging.js';

const config = Configuration.load(['config/default.json', `config/${process.env.APP_ENV || 'local'}.json`, `config/secrets.json`, 'config/runtime.json']);

await initLogging(config.logging);

const postgres = new Postgres({ config: config.postgres });
const server = new WebServer({ config: config.server, postgres });
const application = new Application({ postgres, server });

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, async () => {
    await application.stop();
    process.exit(0);
  });
});

await application.start();
