import { customAlphabet } from 'nanoid';
import normalizeUrl from 'normalize-url';
import { ValidationError } from './errors/index.js';

export interface KeyConfig {
  alphabet: string;
  length: number;
}

export default class Redirect {
  private constructor(
    public readonly key: string,
    public readonly url: string,
  ) {}

  static fromURL(url: string, keyConfig: KeyConfig): Redirect {
    validateURL(url);
    const normalised = normaliseURL(url);

    const nanoid = customAlphabet(keyConfig.alphabet, keyConfig.length);
    const key = nanoid();

    return new Redirect(key, normalised);
  }

  static fromJSON({ key, url }: { key: string; url: string }): Redirect {
    return new Redirect(key, url);
  }

  toJSON() {
    return {
      key: this.key,
      url: this.url,
    };
  }
}

function normaliseURL(url: string): string {
  try {
    return normalizeUrl(url, {
      defaultProtocol: 'https',
      normalizeProtocol: true,
      forceHttps: false,
      stripHash: false,
      stripWWW: false,
      removeQueryParameters: false,
      sortQueryParameters: true,
      removeTrailingSlash: false,
    });
  } catch (err) {
    throw new ValidationError(`Invalid URL: '${url}'`, err as Error);
  }
}

function validateURL(url: string): void {
  try {
    const parsed = new URL(url);

    const hasAuthentication = parsed.username || parsed.password;
    if (hasAuthentication) throw new ValidationError(`Invalid URL: '${url}' contains authentication credentials`);
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError(`Invalid URL: '${url}'`, err as Error);
  }
}
