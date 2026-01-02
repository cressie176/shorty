import marv from 'marv/api/promise';
import driver from 'marv-pg-driver';
import { logger } from '../infra/Logger.js';

export default async function initMarv(config: any) {
  if (!config.migrations.apply) return;

  logger.info('Migrating postgres');

  const marvDriver = driver({
    connection: {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
    },
  });

  const migrations = await marv.scan(config.migrations.directory);
  await marv.migrate(migrations, marvDriver);

  logger.info('Postgres migrated');
}
