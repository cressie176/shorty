import { equal as eq } from 'node:assert/strict';
import { describe, it } from 'node:test';
import KeyGenerator from '../../src/services/KeyGenerator.js';

describe('KeyGenerator', () => {
  const generator = new KeyGenerator();

  it('generates 12 character keys', () => {
    const key = generator.generate();
    eq(key.length, 12);
  });

  it('generates URL-safe keys', () => {
    const key = generator.generate();
    eq(/^[A-Za-z0-9]+$/.test(key), true);
  });

  it('generates unique keys', () => {
    const keys = new Set();
    for (let i = 0; i < 1000; i++) {
      keys.add(generator.generate());
    }
    eq(keys.size, 1000);
  });

  it('does not generate keys with rude words', () => {
    const rudeWords = ['fuck', 'shit', 'ass', 'dick', 'cunt'];

    for (let i = 0; i < 1000; i++) {
      const key = generator.generate();
      const lowerKey = key.toLowerCase();

      for (const word of rudeWords) {
        eq(lowerKey.includes(word), false, `Key ${key} contains rude word: ${word}`);
      }
    }
  });
});
