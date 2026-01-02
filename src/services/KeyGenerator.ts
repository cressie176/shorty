import { randomBytes } from 'node:crypto';

export default class KeyGenerator {
  private static readonly ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  private static readonly ALPHABET_LENGTH = KeyGenerator.ALPHABET.length;
  private static readonly KEY_LENGTH = 12;

  private static readonly RUDE_WORDS = new Set(['arse', 'ass', 'bastard', 'bitch', 'bollocks', 'cock', 'crap', 'cunt', 'damn', 'dick', 'fuck', 'hell', 'piss', 'shit', 'slut', 'tit', 'twat', 'wank']);

  generate(): string {
    let key: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      key = this.generateRandomKey();
      attempts++;

      if (attempts > maxAttempts) {
        throw new Error('Failed to generate non-rude key after maximum attempts');
      }
    } while (this.containsRudeWord(key));

    return key;
  }

  private generateRandomKey(): string {
    const bytes = randomBytes(KeyGenerator.KEY_LENGTH);
    let key = '';

    for (let i = 0; i < KeyGenerator.KEY_LENGTH; i++) {
      const index = bytes[i] % KeyGenerator.ALPHABET_LENGTH;
      key += KeyGenerator.ALPHABET[index];
    }

    return key;
  }

  private containsRudeWord(key: string): boolean {
    const lowerKey = key.toLowerCase();

    for (const word of KeyGenerator.RUDE_WORDS) {
      if (lowerKey.includes(word)) {
        return true;
      }
    }

    return false;
  }
}
