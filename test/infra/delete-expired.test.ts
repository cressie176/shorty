import { equal as eq, ok } from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import Configuration from '../../src/infra/Configuration.js';
import initLogging from '../../src/init/init-logging.js';
import RedirectService from '../../src/services/RedirectService.js';
import TestPostgres from '../../test-src/TestPostgres.js';

describe('Delete Expired Redirects', () => {
  let postgres: TestPostgres;
  let redirectService: RedirectService;
  let config: any;

  before(async () => {
    config = Configuration.load(['config/default.json', 'config/local.json', 'config/test.json']);

    await initLogging(config.logging);

    postgres = new TestPostgres({ config: config.postgres });
    redirectService = new RedirectService({ config: config.redirect, postgres });

    await postgres.start();
  });

  after(async () => {
    await postgres.nuke();
    await postgres.stop();
  });

  it('deletes expired redirects and logs count', async () => {
    const expiredConfig = { ...config.redirect, expiry: '-1 second' };
    const expiredService = new RedirectService({ config: expiredConfig, postgres });

    await expiredService.saveRedirect('https://example.com/expired1');
    await expiredService.saveRedirect('https://example.com/expired2');
    await redirectService.saveRedirect('https://example.com/active');

    let noticeMessage = '';
    const listener = (log: any) => {
      if (log.level === 'INFO' && log.message === 'PostgreSQL NOTICE') {
        noticeMessage = log.context.message;
      }
    };

    process.on('LOG', listener);

    const { rows } = await postgres.withClient(async (client) => {
      return client.query('SELECT delete_expired_redirects() as count');
    });

    process.off('LOG', listener);

    eq(rows[0].count, 2);
    ok(noticeMessage.includes('Deleted 2 expired redirects'));
  });
});
