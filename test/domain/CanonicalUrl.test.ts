import { describe, it } from 'node:test';
import { equal as eq, throws } from 'node:assert/strict';
import CanonicalUrl from '../../src/domain/CanonicalUrl.js';
import { ValidationError } from '../../src/errors/index.js';

describe('CanonicalUrl', () => {
  it('canonicalises URL with sorted query parameters', () => {
    const canonical = new CanonicalUrl('https://example.com/path?z=1&a=2');

    eq(canonical.toString(), 'https://example.com/path?a=2&z=1');
  });

  it('canonicalises URLs without query parameters', () => {
    const canonical = new CanonicalUrl('https://example.com/path');

    eq(canonical.toString(), 'https://example.com/path');
  });

  it('canonicalises URLs with fragments', () => {
    const canonical = new CanonicalUrl('https://example.com/path#section');

    eq(canonical.toString(), 'https://example.com/path#section');
  });

  it('canonicalises URL protocol and hostname', () => {
    const canonical = new CanonicalUrl('HTTP://EXAMPLE.COM/Path');

    eq(canonical.toString(), 'http://example.com/Path');
  });

  it('collapses default HTTP port', () => {
    const canonical = new CanonicalUrl('http://example.com:80/path');

    eq(canonical.toString(), 'http://example.com/path');
  });

  it('collapses default HTTPS port', () => {
    const canonical = new CanonicalUrl('https://example.com:443/path');

    eq(canonical.toString(), 'https://example.com/path');
  });

  it('throws ValidationError for invalid URLs', () => {
    throws(() => new CanonicalUrl('not a url'), (err: Error) => {
      return err instanceof ValidationError;
    });
  });
});
