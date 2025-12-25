import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const STORE_REDIRECT_SQL = readFileSync(join(__dirname, 'store-redirect.sql'), 'utf-8');
export const GET_REDIRECT_SQL = readFileSync(join(__dirname, 'get-redirect.sql'), 'utf-8');
