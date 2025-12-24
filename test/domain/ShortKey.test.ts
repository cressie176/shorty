import { equal as eq, match, notEqual as neq } from 'node:assert/strict';
import { describe, it } from 'node:test';
import ShortKey from '../../src/domain/ShortKey.js';

describe('ShortKey', () => {
  it('generates a short key on construction', () => {
    const shortKey = new ShortKey();

    const key = shortKey.toString();
    eq(typeof key, 'string');
    eq(key.length > 0, true);
  });

  it('short key is URL-safe', () => {
    const shortKey = new ShortKey();

    const key = shortKey.toString();
    match(key, /^[0-9bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ-]+$/);
  });

  it('short key length is within max 12 characters', () => {
    const shortKey = new ShortKey();

    const key = shortKey.toString();
    eq(key.length <= 12, true);
  });

  it('toString returns the generated key', () => {
    const shortKey = new ShortKey();

    const key1 = shortKey.toString();
    const key2 = shortKey.toString();
    eq(key1, key2);
  });

  it('multiple instances generate different keys', () => {
    const shortKey1 = new ShortKey();
    const shortKey2 = new ShortKey();

    neq(shortKey1.toString(), shortKey2.toString());
  });

  it('keys do not contain vowels', () => {
    const shortKey = new ShortKey();

    const key = shortKey.toString();
    match(key, /^[^aeiouAEIOU]+$/);
  });

  it('keys do not contain underscores', () => {
    const shortKey = new ShortKey();

    const key = shortKey.toString();
    match(key, /^[^_]+$/);
  });
});
