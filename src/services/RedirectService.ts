import { customAlphabet } from 'nanoid';
import CanonicalUrl from '../domain/CanonicalUrl.js';
import Redirect from '../domain/Redirect.js';
import { CollisionError } from '../errors/index.js';
import type Database from '../infra/Database.js';
import { DELETE_EXPIRED_REDIRECTS_SQL, GET_REDIRECT_SQL, STORE_REDIRECT_SQL } from './sql/index.js';

const alphabet = '0123456789bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ-';
const nanoid = customAlphabet(alphabet, 8);

const PG_UNIQUE_VIOLATION = '23505';

type RedirectServiceParams = {
  database: Database;
  config: any;
  generateKey?: () => string;
};

export default class RedirectService {
  private readonly config: any;
  private readonly database: Database;
  private readonly generateKey: () => string;

  constructor({ config, database, generateKey }: RedirectServiceParams) {
    this.config = config;
    this.database = database;
    this.generateKey = generateKey ?? nanoid;
  }

  async storeRedirect(url: CanonicalUrl): Promise<Redirect> {
    const key = this.generateKey();
    try {
      const row = await this.selectFirstRow(STORE_REDIRECT_SQL, [key, url.toString(), this.config.expiry]);
      return new Redirect(row.key, new CanonicalUrl(row.url));
    } catch (err: any) {
      if (err.code === PG_UNIQUE_VIOLATION && err.constraint === 'redirect_pkey') {
        throw new CollisionError({ message: `Collision detected for key '${key}'`, cause: err });
      }
      throw err;
    }
  }

  async getRedirect(key: string): Promise<Redirect | null> {
    const row = await this.selectFirstRow(GET_REDIRECT_SQL, [key, this.config.expiry]);
    return row ? new Redirect(row.key, new CanonicalUrl(row.url)) : null;
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
