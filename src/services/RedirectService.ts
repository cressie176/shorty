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
}
