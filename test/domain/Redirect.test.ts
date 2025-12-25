import { equal as eq } from 'node:assert/strict';
import { describe, it } from 'node:test';
import CanonicalUrl from '../../src/domain/CanonicalUrl.js';
import Redirect from '../../src/domain/Redirect.js';
import ShortKey from '../../src/domain/ShortKey.js';

describe('Redirect', () => {
  it('constructs with ShortKey and CanonicalUrl', () => {
    const key = new ShortKey('test-key');
    const url = new CanonicalUrl('https://example.com/path');

    const redirect = new Redirect(key, url);

    eq(redirect.getKey(), key);
    eq(redirect.getUrl(), url);
  });

  it('returns the key as string', () => {
    const key = new ShortKey('abc123');
    const url = new CanonicalUrl('https://example.com');

    const redirect = new Redirect(key, url);

    eq(redirect.getKey().toString(), 'abc123');
  });

  it('returns the canonical URL as string', () => {
    const key = new ShortKey('xyz789');
    const url = new CanonicalUrl('https://example.com/path?z=1&a=2');

    const redirect = new Redirect(key, url);

    eq(redirect.getUrl().toString(), 'https://example.com/path?a=2&z=1');
  });

  it('serialises to JSON with key and url', () => {
    const key = new ShortKey('json-key');
    const url = new CanonicalUrl('https://example.com/path?z=1&a=2');

    const redirect = new Redirect(key, url);

    const json = redirect.toJSON();
    eq(json.key, 'json-key');
    eq(json.url, 'https://example.com/path?a=2&z=1');
  });
});
