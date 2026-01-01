# PostgreSQL Template Wiring Guide

This guide shows exactly how to wire the PostgreSQL layer into your service after the template files have been copied.

## Files Added

The PostgreSQL template adds these files to your project:

- `src/infra/Postgres.ts`
- `src/init/init-migrations.ts`
- `src/migrations/001.create-nuke-function.sql`
- `test-src/TestPostgres.ts`
- `test/infra/Postgres.test.ts`
- `docker/Dockerfile.postgres`
- `docker/docker-compose.postgres.yml`

Configuration and package.json are merged with base template files.

## Step-by-Step Wiring

### 1. Update `src/infra/Application.ts`

**Add import:**
```typescript
import type Postgres from './Postgres.js';
```

**Update ApplicationParams interface:**
```typescript
export interface ApplicationParams {
  postgres: Postgres;
  server: WebServer;
}
```

**Add property:**
```typescript
private readonly postgres: Postgres;
```

**Update constructor:**
```typescript
constructor({ postgres, server }: ApplicationParams) {
  this.postgres = postgres;
  this.server = server;
}
```

**Update start():**
```typescript
await this.postgres.start();
await this.server.start();
```

**Update stop():**
```typescript
await this.server.stop();
await this.postgres.stop();
```

### 2. Update `src/infra/WebServer.ts`

**Add import:**
```typescript
import type Postgres from './Postgres.js';
```

**Update WebServerParams:**
```typescript
export interface WebServerParams {
  config: WebServerConfig;
  postgres: Postgres;
}
```

**Update constructor:**
```typescript
constructor({ config, postgres }: WebServerParams) {
  this.config = Object.assign({ host: '0.0.0.0' }, config);
  this.app = new Hono();
  this.app.onError(errorHandler);
  this.app.route('/__', createStatusRoutes({ postgres }));
}
```

### 3. Update `src/routes/status.ts`

**Add imports:**
```typescript
import { HealthCheckError } from '../domain/errors/index.js';
import type Postgres from '../infra/Postgres.js';
```

**Update function:**
```typescript
export default function createStatusRoutes({ postgres }: { postgres: Postgres }) {
  const app = new Hono();

  app.get('/health', async (c) => {
    try {
      await Promise.all([
        postgres.test(),
      ]);
      return c.json({ message: 'OK' });
    } catch (err) {
      throw new HealthCheckError('Health check failed', err as Error);
    }
  });

  return app;
}
```

### 4. Update `index.ts`

**Add import:**
```typescript
import Postgres from './src/infra/Postgres.js';
```

**Instantiate postgres:**
```typescript
const postgres = new Postgres({ config: config.postgres });
const server = new WebServer({ config: config.server, postgres });
const application = new Application({ postgres, server });
```

### 5. Update `.github/workflows/ci.yml`

**Add step after "Setup Node.js":**
```yaml
      - name: Start PostgreSQL
        run: docker compose -f docker/docker-compose.postgres.yml up -d postgres-test
```

**Add to "Run tests" step:**
```yaml
      - name: Run tests
        run: npm test
        env:
          APP_ENV: test
```

**Add step at the end (after "Run tests"):**
```yaml
      - name: Stop PostgreSQL
        if: always()
        run: docker compose -f docker/docker-compose.postgres.yml down
```

## Testing

See `test/infra/Postgres.test.ts` for a complete example of testing with the postgres.

**Key points:**
- Use `TestPostgres` instead of `Postgres` for tests
- Call `await postgres.nuke()` in `afterEach` to clean between tests
- Start postgres in `before` and stop in `after`

## Running the Postgres

```bash
docker compose up -d postgres
docker compose --profile test up -d postgres-test
npm run pg:migrate
docker compose down
```

## Configuration

Postgres config has been merged into `config/*.json` files.

### Migration Strategy

**Local development:**
- Migrations run automatically on application start for convenience
- Configured in `config/local.json` with `migrations.apply: true`

**Production/staging environments:**
- Migrations should ideally NOT run on application start
- Long-running migrations (indexes, columns with defaults) can block health checks and cause rollbacks
- Ideally run migrations pre-deployment using: `npm run pg:migrate`
- This runs the `bin/migrate.ts` script which applies migrations then exits
- Default config has `migrations.apply: false`
