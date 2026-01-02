import { MissingRedirectError } from '../domain/errors/index.js';
import type { Redirect } from '../domain/models/Redirect.js';
import type Postgres from '../infra/Postgres.js';
import type KeyGenerator from './KeyGenerator.js';
import type UrlValidator from './UrlValidator.js';

export default class RedirectService {
  private readonly postgres: Postgres;
  private readonly urlValidator: UrlValidator;
  private readonly keyGenerator: KeyGenerator;

  constructor({
    postgres,
    urlValidator,
    keyGenerator,
  }: {
    postgres: Postgres;
    urlValidator: UrlValidator;
    keyGenerator: KeyGenerator;
  }) {
    this.postgres = postgres;
    this.urlValidator = urlValidator;
    this.keyGenerator = keyGenerator;
  }

  async createRedirect(urlString: string): Promise<Redirect> {
    const url = this.urlValidator.validate(urlString);
    const normalisedUrl = this.urlValidator.normalise(url);
    const key = this.keyGenerator.generate();

    await this.postgres.withClient(async (client) => {
      await client.query('INSERT INTO redirects (key, url, created_at) VALUES ($1, $2, NOW())', [key, normalisedUrl]);
    });

    return {
      key,
      url: normalisedUrl,
      createdAt: new Date(),
    };
  }

  async getRedirect(key: string): Promise<Redirect> {
    let redirect: Redirect | null = null;

    await this.postgres.withClient(async (client) => {
      const result = await client.query('SELECT key, url, created_at FROM redirects WHERE key = $1', [key]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        redirect = {
          key: row.key,
          url: row.url,
          createdAt: row.created_at,
        };
      }
    });

    if (!redirect) {
      throw new MissingRedirectError(key);
    }

    return redirect;
  }
}
