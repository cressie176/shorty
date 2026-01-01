import { equal as eq, match, ok, throws } from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { ValidationError } from '../../src/domain/errors/index.js';
import Redirect from '../../src/domain/Redirect.js';
import Configuration from '../../src/infra/Configuration.js';

describe('Redirect', () => {
  let config: any;

  before(() => {
    config = Configuration.load(['config/default.json', 'config/local.json', 'config/test.json']);
  });

  describe('fromURL', () => {
    it('normalises URL by sorting query parameters', () => {
      const redirect = Redirect.fromURL('https://example.com/path?z=1&a=2', config.redirect.key);

      eq(redirect.url, 'https://example.com/path?a=2&z=1');
    });

    it('normalises URL by converting host and protocol to lower case', () => {
      const redirect = Redirect.fromURL('HTTPS://EXAMPLE.COM/path', config.redirect.key);

      eq(redirect.url, 'https://example.com/path');
    });

    it('normalises URL by removing default HTTP port', () => {
      const redirect = Redirect.fromURL('http://example.com:80/path', config.redirect.key);

      eq(redirect.url, 'http://example.com/path');
    });

    it('normalises URL by removing default HTTPS port', () => {
      const redirect = Redirect.fromURL('https://example.com:443/path', config.redirect.key);

      eq(redirect.url, 'https://example.com/path');
    });

    it('retains text fragments', () => {
      const redirect = Redirect.fromURL('https://example.com/path#section', config.redirect.key);

      ok(redirect.url.includes('#section'));
    });

    it('retains sub-domains', () => {
      const redirect = Redirect.fromURL('https://sub.example.com/path', config.redirect.key);

      eq(redirect.url, 'https://sub.example.com/path');
    });

    it('retains trailing slash', () => {
      const redirect = Redirect.fromURL('https://example.com/path/', config.redirect.key);

      eq(redirect.url, 'https://example.com/path/');
    });

    it('generates unique 12-character key', () => {
      const redirect = Redirect.fromURL('https://example.com', config.redirect.key);

      eq(redirect.key.length, 12);
    });

    it('generates key using custom alphabet', () => {
      const redirect = Redirect.fromURL('https://example.com', config.redirect.key);

      match(redirect.key, /^[BCDFGHJKLMNPQRSTVWXYZbcdfghjklmnpqrstvwxyz0123456789-]+$/);
    });

    it('generates key without vowels', () => {
      const redirect = Redirect.fromURL('https://example.com', config.redirect.key);

      ok(!/[AEIOUaeiou]/.test(redirect.key));
    });

    it('generates key without underscores', () => {
      const redirect = Redirect.fromURL('https://example.com', config.redirect.key);

      ok(!redirect.key.includes('_'));
    });

    it('throws ValidationError for invalid URL', () => {
      throws(
        () => Redirect.fromURL('', config.redirect.key),
        (err: Error) => {
          ok(err instanceof ValidationError);
          match(err.message, /Invalid URL/);
          return true;
        },
      );
    });

    it('throws ValidationError for URL with authentication credentials', () => {
      throws(
        () => Redirect.fromURL('https://user:pass@example.com/path', config.redirect.key),
        (err: Error) => {
          ok(err instanceof ValidationError);
          match(err.message, /authentication credentials/);
          return true;
        },
      );
    });
  });

  describe('toJSON', () => {
    it('serialises to JSON with key and url', () => {
      const redirect = Redirect.fromURL('https://example.com/path?z=1&a=2', config.redirect.key);

      const json = redirect.toJSON();

      eq(json.key, redirect.key);
      eq(json.url, 'https://example.com/path?a=2&z=1');
    });
  });
});
