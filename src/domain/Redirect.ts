import type CanonicalUrl from './CanonicalUrl.js';
import type ShortKey from './ShortKey.js';

export default class Redirect {
  private readonly key: ShortKey;
  private readonly url: CanonicalUrl;

  constructor(key: ShortKey, url: CanonicalUrl) {
    this.key = key;
    this.url = url;
  }

  getKey(): ShortKey {
    return this.key;
  }

  getUrl(): CanonicalUrl {
    return this.url;
  }

  toJSON(): { key: string; url: string } {
    return {
      key: this.key.toString(),
      url: this.url.toString(),
    };
  }
}
