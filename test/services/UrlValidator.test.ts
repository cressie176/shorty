import { equal as eq, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ValidationError } from '../../src/domain/errors/index.js';
import UrlValidator from '../../src/services/UrlValidator.js';

describe('UrlValidator', () => {
  const validator = new UrlValidator();

  describe('validate', () => {
    it('accepts valid HTTP URLs', () => {
      const url = validator.validate('http://example.com');
      eq(url.toString(), 'http://example.com/');
    });

    it('accepts valid HTTPS URLs', () => {
      const url = validator.validate('https://example.com');
      eq(url.toString(), 'https://example.com/');
    });

    it('rejects invalid URLs', () => {
      throws(
        () => validator.validate('not-a-valid-url'),
        (err: Error) => err instanceof ValidationError && err.message === "Invalid URL: 'not-a-valid-url'",
      );
    });

    it('rejects URLs with username', () => {
      throws(
        () => validator.validate('https://user@example.com'),
        (err: Error) => err instanceof ValidationError,
      );
    });

    it('rejects URLs with password', () => {
      throws(
        () => validator.validate('https://user:pass@example.com'),
        (err: Error) => err instanceof ValidationError,
      );
    });

    it('rejects non-HTTP(S) protocols', () => {
      throws(
        () => validator.validate('ftp://example.com'),
        (err: Error) => err instanceof ValidationError,
      );
    });
  });

  describe('normalise', () => {
    it('converts protocol to lowercase', () => {
      const url = new URL('HTTP://example.com');
      const normalised = validator.normalise(url);
      eq(normalised, 'http://example.com/');
    });

    it('converts host to lowercase', () => {
      const url = new URL('https://EXAMPLE.COM');
      const normalised = validator.normalise(url);
      eq(normalised, 'https://example.com/');
    });

    it('removes default HTTP port', () => {
      const url = new URL('http://example.com:80/path');
      const normalised = validator.normalise(url);
      eq(normalised, 'http://example.com/path');
    });

    it('removes default HTTPS port', () => {
      const url = new URL('https://example.com:443/path');
      const normalised = validator.normalise(url);
      eq(normalised, 'https://example.com/path');
    });

    it('retains non-default ports', () => {
      const url = new URL('https://example.com:8443/path');
      const normalised = validator.normalise(url);
      eq(normalised, 'https://example.com:8443/path');
    });

    it('sorts query parameters', () => {
      const url = new URL('https://example.com/path?z=1&a=2&m=3');
      const normalised = validator.normalise(url);
      eq(normalised, 'https://example.com/path?a=2&m=3&z=1');
    });

    it('retains hash', () => {
      const url = new URL('https://example.com/path#section');
      const normalised = validator.normalise(url);
      eq(normalised, 'https://example.com/path#section');
    });

    it('retains trailing slash', () => {
      const url = new URL('https://example.com/path/');
      const normalised = validator.normalise(url);
      eq(normalised, 'https://example.com/path/');
    });

    it('retains subdomain', () => {
      const url = new URL('https://sub.example.com/path');
      const normalised = validator.normalise(url);
      eq(normalised, 'https://sub.example.com/path');
    });

    it('handles multiple values for same query parameter', () => {
      const url = new URL('https://example.com?a=1&a=2&b=3');
      const normalised = validator.normalise(url);
      eq(normalised, 'https://example.com/?a=1&a=2&b=3');
    });
  });
});
