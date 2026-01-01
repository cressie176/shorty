import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const upsertRedirect = readFileSync(join(__dirname, 'upsert-redirect.sql'), 'utf-8');
export const getRedirect = readFileSync(join(__dirname, 'get-redirect.sql'), 'utf-8');
