import CanonicalUrl from '../domain/CanonicalUrl.js';
import type Redirect from '../domain/Redirect.js';
import RedirectDomain from '../domain/Redirect.js';
import ShortKey from '../domain/ShortKey.js';
import type Database from '../infra/Database.js';
import { GET_REDIRECT_SQL, STORE_REDIRECT_SQL } from './sql/index.js';

export default class RedirectService {
  private readonly database: Database;
  private readonly redirectConfig: any;

  constructor({ database, redirectConfig }: { database: Database; redirectConfig: any }) {
    this.database = database;
    this.redirectConfig = redirectConfig;
  }

  async storeRedirect(url: CanonicalUrl): Promise<Redirect> {
    const key = new ShortKey();
    const row = await this.selectFirstRow(STORE_REDIRECT_SQL, [key.toString(), url.toString()]);
    return new RedirectDomain(new ShortKey(row.key), new CanonicalUrl(row.url));
  }

  async getRedirect(key: ShortKey): Promise<Redirect | null> {
    const row = await this.selectFirstRow(GET_REDIRECT_SQL, [key.toString(), this.redirectConfig.expiryInterval]);
    return row ? new RedirectDomain(new ShortKey(row.key), new CanonicalUrl(row.url)) : null;
  }

  private async selectFirstRow(sql: string, params: any[]) {
    const {
      rows: [row],
    } = await this.database.withClient((client) => client.query(sql, params));
    return row;
  }
}
