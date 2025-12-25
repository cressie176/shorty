import type CanonicalUrl from './CanonicalUrl.js';

export default class Redirect {
  private readonly key: string;
  private readonly url: CanonicalUrl;

  constructor(key: string, url: CanonicalUrl) {
    this.key = key;
    this.url = url;
  }

  getKey(): string {
    return this.key;
  }

  getUrl(): CanonicalUrl {
    return this.url;
  }

  toJSON(): { key: string; url: string } {
    return {
      key: this.key,
      url: this.url.toString(),
    };
  }
}
