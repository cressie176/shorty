import { KeyCollisionError, MissingRedirectError } from '../domain/errors/index.js';
import type { KeyConfig } from '../domain/Redirect.js';
import Redirect from '../domain/Redirect.js';
import type Postgres from '../infra/Postgres.js';
import * as sql from './redirect-service/index.js';

export interface RedirectConfig {
  key: KeyConfig;
}

export interface RedirectServiceParams {
  config: RedirectConfig;
  postgres: Postgres;
}

export default class RedirectService {
  private readonly config: RedirectConfig;
  private readonly postgres: Postgres;

  constructor({ config, postgres }: RedirectServiceParams) {
    this.config = config;
    this.postgres = postgres;
  }

  async saveRedirect(url: string): Promise<Redirect> {
    const candidate = Redirect.fromURL(url, this.config.key);

    try {
      const { rows } = await this.postgres.withClient(async (client) => {
        return client.query(sql.upsertRedirect, [candidate.key, candidate.url]);
      });

      return Redirect.fromJSON(rows[0]);
    } catch (err: any) {
      if (err.code === '23505') throw new KeyCollisionError(`Key collision '${candidate.key}'`, err);
      throw err;
    }
  }

  async getRedirect(key: string): Promise<Redirect> {
    const { rows } = await this.postgres.withClient(async (client) => {
      return client.query(sql.getRedirect, [key]);
    });

    if (rows.length === 0) throw new MissingRedirectError(`Redirect for '${key}' not found`);

    return Redirect.fromJSON(rows[0]);
  }
}
