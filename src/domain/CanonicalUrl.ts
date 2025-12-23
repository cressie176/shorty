import { ValidationError } from '../errors/index.js';

export default class CanonicalUrl {
  private readonly url: URL;

  constructor(urlString: string) {
    try {
      this.url = new URL(urlString);
    } catch (err) {
      throw new ValidationError({ message: 'Invalid URL', cause: err as Error });
    }
  }

  toString(): string {
    const url = new URL(this.url.href);
    const params = new URLSearchParams(url.search);
    const sortedParams = new URLSearchParams();
    Array.from(params.keys())
      .sort()
      .forEach((key) => sortedParams.set(key, params.get(key)!));

    url.search = sortedParams.toString();

    return url.href;
  }
}
