import type { KeyConfig } from '../domain/Redirect.js';
import Redirect from '../domain/Redirect.js';

export interface RedirectConfig {
  key: KeyConfig;
}

export default class RedirectService {
  constructor(private readonly config: RedirectConfig) {}

  async saveRedirect(url: string): Promise<Redirect> {
    return Redirect.fromURL(url, this.config.key);
  }
}
