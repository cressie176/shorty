import { customAlphabet } from 'nanoid';
import CanonicalUrl from '../domain/CanonicalUrl.js';
import type Redirect from '../domain/Redirect.js';
import RedirectDomain from '../domain/Redirect.js';
import type Database from '../infra/Database.js';
import { DELETE_EXPIRED_REDIRECTS_SQL, GET_REDIRECT_SQL, STORE_REDIRECT_SQL } from './sql/index.js';

const alphabet = '0123456789bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ-';
const nanoid = customAlphabet(alphabet, 8);

export default class RedirectService {
  private readonly database: Database;
  private readonly redirectConfig: any;

  constructor({ database, redirectConfig }: { database: Database; redirectConfig: any }) {
    this.database = database;
    this.redirectConfig = redirectConfig;
  }

  async storeRedirect(url: CanonicalUrl): Promise<Redirect> {
    const key = nanoid();
    const row = await this.selectFirstRow(STORE_REDIRECT_SQL, [key, url.toString(), this.redirectConfig.expiryInterval]);
    return new RedirectDomain(row.key, new CanonicalUrl(row.url));
  }

  async getRedirect(key: string): Promise<Redirect | null> {
    const row = await this.selectFirstRow(GET_REDIRECT_SQL, [key, this.redirectConfig.expiryInterval]);
    return row ? new RedirectDomain(row.key, new CanonicalUrl(row.url)) : null;
  }

  async deleteExpiredRedirects(): Promise<number> {
    const { deleted } = await this.selectFirstRow(DELETE_EXPIRED_REDIRECTS_SQL, []);
    return deleted;
  }

  private async selectFirstRow(sql: string, params: any[]) {
    const {
      rows: [row],
    } = await this.database.withClient((client) => client.query(sql, params));
    return row;
  }
}
