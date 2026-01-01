import Configuration from '../src/infra/Configuration.js';
import initLogging from '../src/init/init-logging.js';
import initMigrations from '../src/init/init-migrations.js';

const config = Configuration.load(['config/default.json', `config/${process.env.APP_ENV || 'local'}.json`, 'config/secrets.json', 'config/runtime.json']);

await initLogging(config.logging);
await initMigrations(config.database);

process.exit(0);
