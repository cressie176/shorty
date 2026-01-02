import { equal as eq } from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import Configuration from '../../src/infra/Configuration.js';
import initLogging from '../../src/init/init-logging.js';
import TestPostgres from '../../test-src/TestPostgres.js';

describe('Postgres', () => {
  let postgres: TestPostgres;
  let config: any;

  before(async () => {
    config = Configuration.load(['config/default.json', 'config/local.json', 'config/test.json']);
    await initLogging(config.logging);

    postgres = new TestPostgres({ config: config.postgres });
  });

  afterEach(async () => {
    await postgres.start();
    await postgres.nuke();
  });

  after(async () => {
    await postgres.stop();
  });

  it('can start and stop', async () => {
    await postgres.start();
    await postgres.stop();
  });

  it('can test connection', async () => {
    await postgres.start();
    await postgres.test();
    await postgres.stop();
  });

  it('can execute queries with withClient', async () => {
    await postgres.start();

    const result = await postgres.withClient(async (client) => {
      const res = await client.query('SELECT 1 as value');
      return res.rows[0].value;
    });

    eq(result, 1);
    await postgres.stop();
  });

  it('can nuke all data', async () => {
    await postgres.start();

    await postgres.withClient(async (client) => {
      await client.query('CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, value TEXT)');
      await client.query('INSERT INTO test_table (value) VALUES ($1)', ['test']);
    });

    const beforeNuke = await postgres.withClient(async (client) => {
      const res = await client.query('SELECT COUNT(*) FROM test_table');
      return Number.parseInt(res.rows[0].count, 10);
    });
    eq(beforeNuke, 1);

    await postgres.nuke();

    const afterNuke = await postgres.withClient(async (client) => {
      const res = await client.query('SELECT COUNT(*) FROM test_table');
      return Number.parseInt(res.rows[0].count, 10);
    });
    eq(afterNuke, 0);

    await postgres.withClient(async (client) => {
      await client.query('DROP TABLE IF EXISTS test_table CASCADE');
    });

    await postgres.stop();
  });
});
