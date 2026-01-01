declare module 'marv/api/promise' {
  import type { PathLike } from 'node:fs';
  import type { Driver, ParsedMigration, ScanOptions } from 'marv';

  export function migrate(migrations: readonly ParsedMigration[], driver: Driver, options?: { quiet?: boolean }): Promise<void>;
  export function scan(directory: PathLike, options?: ScanOptions): Promise<ParsedMigration[]>;
}
