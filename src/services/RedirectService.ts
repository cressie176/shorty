import CanonicalUrl from '../domain/CanonicalUrl.js';
import type Redirect from '../domain/Redirect.js';
import RedirectDomain from '../domain/Redirect.js';
import ShortKey from '../domain/ShortKey.js';
import type Database from '../infra/Database.js';
import { GET_REDIRECT_SQL, STORE_REDIRECT_SQL } from './sql/index.js';

export default class RedirectService {
  private readonly database: Database;

  constructor({ database }: { database: Database }) {
    this.database = database;
  }

  async storeRedirect(url: CanonicalUrl): Promise<Redirect> {
    const key = new ShortKey();
    const row = await this.firstRow(STORE_REDIRECT_SQL, [key.toString(), url.toString()]);
    return new RedirectDomain(new ShortKey(row.key), new CanonicalUrl(row.url));
  }

  async getRedirect(key: ShortKey): Promise<Redirect | null> {
    const row = await this.firstRow(GET_REDIRECT_SQL, [key.toString()]);
    return row ? new RedirectDomain(new ShortKey(row.key), new CanonicalUrl(row.url)) : null;
  }

  private async firstRow(sql: string, params: any[]) {
    const {
      rows: [row],
    } = await this.database.joinTransaction(async (client) => {
      return await client.query(sql, params);
    });
    return row;
  }
}
