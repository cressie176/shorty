import { customAlphabet } from 'nanoid';

const alphabet = '0123456789bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ-';
const nanoid = customAlphabet(alphabet, 8);

export default class ShortKey {
  private readonly key: string;

  constructor() {
    this.key = nanoid();
  }

  toString(): string {
    return this.key;
  }
}
