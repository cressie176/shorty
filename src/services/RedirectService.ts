import { KeyCollisionError, MissingRedirectError } from '../domain/errors/index.js';
import type { Redirect } from '../domain/models/Redirect.js';
import type Postgres from '../infra/Postgres.js';
import type KeyGenerator from './KeyGenerator.js';
import type UrlValidator from './UrlValidator.js';

export default class RedirectService {
  private readonly postgres: Postgres;
  private readonly urlValidator: UrlValidator;
  private readonly keyGenerator: KeyGenerator;
  private readonly expiryDays: number;

  constructor({
    postgres,
    urlValidator,
    keyGenerator,
    expiryDays,
  }: {
    postgres: Postgres;
    urlValidator: UrlValidator;
    keyGenerator: KeyGenerator;
    expiryDays: number;
  }) {
    this.postgres = postgres;
    this.urlValidator = urlValidator;
    this.keyGenerator = keyGenerator;
    this.expiryDays = expiryDays;
  }

  async createRedirect(urlString: string): Promise<Redirect> {
    const url = this.urlValidator.validate(urlString);
    const normalisedUrl = this.urlValidator.normalise(url);
    const key = this.keyGenerator.generate();

    try {
      await this.postgres.withClient(async (client) => {
        await client.query('INSERT INTO redirects (key, url, created_at, accessed_at) VALUES ($1, $2, NOW(), NOW())', [key, normalisedUrl]);
      });
    } catch (err: any) {
      // PostgreSQL unique violation error code
      if (err.code === '23505') {
        throw new KeyCollisionError(key);
      }
      throw err;
    }

    const now = new Date();
    return {
      key,
      url: normalisedUrl,
      createdAt: now,
      accessedAt: now,
    };
  }

  async getRedirect(key: string): Promise<Redirect> {
    let result: any;

    await this.postgres.withClient(async (client) => {
      result = await client.query('SELECT key, url, created_at, accessed_at FROM redirects WHERE key = $1', [key]);
    });

    if (!result || result.rows.length === 0) {
      throw new MissingRedirectError(key);
    }

    const row = result.rows[0];
    const redirect: Redirect = {
      key: row.key,
      url: row.url,
      createdAt: row.created_at,
      accessedAt: row.accessed_at,
    };

    // Check if redirect has expired
    const expiryDate = new Date(redirect.accessedAt);
    expiryDate.setDate(expiryDate.getDate() + this.expiryDays);

    const now = new Date();
    if (now > expiryDate) {
      throw new MissingRedirectError(key);
    }

    return redirect;
  }

  async updateAccessTime(key: string): Promise<void> {
    await this.postgres.withClient(async (client) => {
      await client.query('UPDATE redirects SET accessed_at = NOW() WHERE key = $1', [key]);
    });
  }
}
