import { ValidationError } from '../domain/errors/index.js';

export default class UrlValidator {
  validate(urlString: string): URL {
    let url: URL;

    try {
      url = new URL(urlString);
    } catch {
      throw new ValidationError(`Invalid URL: '${urlString}'`);
    }

    if (url.username || url.password) {
      throw new ValidationError(`Invalid URL: '${urlString}'`);
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new ValidationError(`Invalid URL: '${urlString}'`);
    }

    return url;
  }

  normalise(url: URL): string {
    const normalisedUrl = new URL(url.toString());

    // Convert protocol, host to lowercase
    normalisedUrl.protocol = normalisedUrl.protocol.toLowerCase();
    normalisedUrl.host = normalisedUrl.host.toLowerCase();

    // Remove default ports
    if ((normalisedUrl.protocol === 'http:' && normalisedUrl.port === '80') || (normalisedUrl.protocol === 'https:' && normalisedUrl.port === '443')) {
      normalisedUrl.port = '';
    }

    // Sort query parameters
    const params = new URLSearchParams(normalisedUrl.search);
    const sortedParams = new URLSearchParams();
    const keys = Array.from(new Set(params.keys())).sort();

    for (const key of keys) {
      const values = params.getAll(key);
      for (const value of values) {
        sortedParams.append(key, value);
      }
    }

    normalisedUrl.search = sortedParams.toString();

    return normalisedUrl.toString();
  }
}
