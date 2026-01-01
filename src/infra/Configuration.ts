import { existsSync as exists, readFileSync as read } from 'node:fs';
import { mergeDeepRight as merge } from 'ramda';

export default class Configuration {
  static load(filenames: string[]): Record<string, any> {
    return Object.freeze(
      filenames
        .filter((filename) => exists(filename))
        .map((filename) => JSON.parse(read(filename, 'utf8')))
        .reduce((config, overrides) => merge(config, overrides), {}),
    );
  }
}
