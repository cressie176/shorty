import { randUrl } from '@ngneat/falso';
import { produce } from 'immer';

export default class TestData {
  static urlRequest(recipe?: (draft: { url: string }) => void) {
    return produce({ url: randUrl() }, recipe || ((draft) => draft));
  }
}
