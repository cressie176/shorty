import { equal as eq } from 'node:assert/strict';
import { describe, it } from 'node:test';
import CanonicalUrl from '../../src/domain/CanonicalUrl.js';
import Redirect from '../../src/domain/Redirect.js';

describe('Redirect', () => {
  it('constructs with string key and CanonicalUrl', () => {
    const key = 'test-key';
    const url = new CanonicalUrl('https://example.com/path');

    const redirect = new Redirect(key, url);

    eq(redirect.getKey(), key);
    eq(redirect.getUrl(), url);
  });

  it('returns the key as string', () => {
    const key = 'abc123';
    const url = new CanonicalUrl('https://example.com');

    const redirect = new Redirect(key, url);

    eq(redirect.getKey(), 'abc123');
  });

  it('returns the canonical URL as string', () => {
    const key = 'xyz789';
    const url = new CanonicalUrl('https://example.com/path?z=1&a=2');

    const redirect = new Redirect(key, url);

    eq(redirect.getUrl().toString(), 'https://example.com/path?a=2&z=1');
  });

  it('serialises to JSON with key and url', () => {
    const key = 'json-key';
    const url = new CanonicalUrl('https://example.com/path?z=1&a=2');

    const redirect = new Redirect(key, url);

    const json = redirect.toJSON();
    eq(json.key, 'json-key');
    eq(json.url, 'https://example.com/path?a=2&z=1');
  });
});
