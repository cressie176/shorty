# shorty

[![CI](https://github.com/cressie176/shorty/workflows/CI/badge.svg)](https://github.com/cressie176/shorty/actions)

A URL shortener service with PostgreSQL persistence, automatic expiry, and scheduled maintenance

## Features

- **Node.js + TypeScript** - Modern ES modules with strict TypeScript configuration
- **Hono Web Framework** - Fast, lightweight web server with type safety
- **PostgreSQL Database** - PostgreSQL 18 with pg_cron extension for scheduled tasks
- **Database Migrations** - Marv migration management with automatic local migrations
- **Structured Logging** - LogTape integration with multiple formatters (JSON, ANSI, pretty)
- **Configuration Management** - JSON-based config with environment-specific overrides
- **Error Handling** - Application error framework with HTTP mapping middleware
- **Lifecycle Management** - Graceful startup/shutdown with signal handling
- **Testing** - Node.js test runner with integration test support
- **Code Quality** - Biome for linting and formatting
- **Git Hooks** - Lefthook for pre-commit linting and testing
- **CI/CD** - GitHub Actions workflow for automated testing and builds

## Getting Started

### Prerequisites

- Node.js 22+
- npm
- Docker and Docker Compose (for PostgreSQL)

### Installation

```bash
npm install
```

### Database Setup

Start PostgreSQL using Docker Compose:

```bash
npm run pg:start
```

This starts two PostgreSQL containers:
- `shorty-db` (port 5432) - Development database
- `shorty-db-test` (port 5433) - Test database

#### Migrations

In local development, migrations run automatically when the application starts (configured in `config/local.json`).

For production or staging environments, run migrations manually before deployment:

```bash
npm run pg:migrate
```

#### Stopping PostgreSQL

```bash
npm run pg:stop
```

### Development

Start the development server with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000`.

### Testing

Run all tests:

```bash
npm test
```

Run specific tests:

```bash
npm run test:match <pattern>
```

### Building

Build for production:

```bash
npm run build
```

### Linting

Check code quality:

```bash
npm run lint
```

Auto-fix issues:

```bash
npm run lint:fix
```

## Project Structure

```
.
├── config/                 # Configuration files
│   ├── default.json       # Default configuration
│   ├── local.json         # Local overrides (gitignored)
│   └── test.json          # Test environment config
├── docker/                # Docker configuration
│   ├── docker-compose.postgres.yml  # PostgreSQL containers
│   └── Dockerfile.postgres          # Custom PostgreSQL image
├── src/
│   ├── domain/            # Domain models and business logic
│   │   └── errors/        # Error classes
│   ├── infra/             # Infrastructure (Application, WebServer, Logger, Postgres)
│   ├── init/              # Initialization routines (logging, migrations)
│   ├── middleware/        # HTTP middleware
│   ├── migrations/        # Database migration scripts
│   ├── routes/            # HTTP route handlers
│   └── services/          # Service layer
├── test/                  # Test files
├── test-src/              # Test utilities (TestClient, TestPostgres)
├── index.ts               # Application entry point
└── package.json
```

## Configuration

Configuration is loaded from JSON files in the `config/` directory:

1. `default.json` - Base configuration
2. `local.json` - Local development overrides
3. `${APP_ENV}.json` - Environment-specific (e.g., `production.json`, `staging.json`)
4. `secrets.json` - Secrets (gitignored)
5. `runtime.json` - Runtime overrides (gitignored)

Set the `APP_ENV` environment variable to switch environments (defaults to `local`).

### PostgreSQL Configuration

PostgreSQL connection and migration settings are configured in `config/default.json`:

```json
{
  "postgres": {
    "host": "localhost",
    "port": 5432,
    "database": "shorty",
    "user": "shorty",
    "password": "shorty",
    "min": 1,
    "max": 10,
    "idleTimeoutMillis": 30000,
    "connectionTimeoutMillis": 2000,
    "application_name": "shorty",
    "migrations": {
      "apply": false,
      "directory": "src/migrations"
    }
  }
}
```

In `config/local.json`, migrations are enabled to run automatically:

```json
{
  "postgres": {
    "migrations": {
      "apply": true
    }
  }
}
```

### Redirect Expiry Configuration

Redirects automatically expire after a configurable period of inactivity. The expiry period is set in the redirect configuration:

```json
{
  "redirect": {
    "expiry": "1 day"
  }
}
```

**Default** (`config/default.json`): 1 day
**Production** (`config/production.json`): 1 year

The expiry uses PostgreSQL interval syntax (e.g., "1 day", "1 year", "30 days", "6 months").

**Expiry Behavior:**
- When a redirect is created, `expires_at` is set to current time + expiry period
- When a redirect is accessed, both `accessed_at` and `expires_at` are updated (sliding window)
- Expired redirects return 404 Not Found, even if they exist in the database
- All expiry checks are performed at the database level for consistency
- Expired redirects are automatically deleted hourly by a scheduled PostgreSQL job
- Deletions are logged with the count of deleted redirects

## API Endpoints

### Shorten URL

```
POST /api/redirect
```

Creates a shortened URL redirect.

**Request Body:**
```json
{
  "url": "https://example.com/path?z=1&a=2"
}
```

**Success Response (201 Created):**
```json
{
  "key": "11AAAA",
  "url": "https://example.com/path?a=2&z=1"
}
```

**Validation Response (400 Bad Request):**
```json
{
  "message": "Invalid URL: ''",
  "code": "VALIDATION_ERROR"
}
```

**Conflict Response (409 Conflict):**
```json
{
  "message": "Key collision 'ABC123'",
  "code": "KEY_COLLISION"
}
```

This extremely rare case occurs when the same short key is randomly generated for different URLs.

**URL Normalisation:**
- Query parameters are sorted alphabetically
- Protocol and host are converted to lowercase
- Default HTTP (80) and HTTPS (443) ports are removed
- Text fragments, hashes, sub-domains, and trailing slashes are retained
- URLs with authentication credentials are rejected

**Key Generation:**
- Keys are 12 characters long
- Uses a custom alphabet excluding vowels (to prevent rude words) and underscores
- Keys are URL-safe and consist of: `BCDFGHJKLMNPQRSTVWXYZbcdfghjklmnpqrstvwxyz0123456789-`

**Behaviour:**
- Duplicate URLs return the same key (upsert behaviour)
- Handles concurrent requests for the same URL without creating duplicates
- Redirects automatically expire after a configurable period of inactivity
- Accessing a redirect extends its expiry (sliding window expiration)

### Get URL

```
GET /api/redirect/:key
```

Retrieves the URL for a given short key.

**Success Response (200 OK):**
```json
{
  "key": "11AAAA",
  "url": "https://example.com/path?a=2&z=1"
}
```

**Not Found Response (404 Not Found):**
```json
{
  "message": "Redirect for 'nonexistent' not found",
  "code": "MISSING_REDIRECT"
}
```

### Redirect (Browser)

```
GET /r/:key
```

Redirects the browser to the normalised URL for the given short key.

**Success Response (301 Moved Permanently):**
```
Location: https://example.com/path?a=2&z=1
```

**Not Found Response (404 Not Found):**

Returns an HTML page with a user-friendly error message:

```html
<html lang="en">
  <head>
    <title>Shorty</title>
  </head>
  <body>
    <h1>Missing Redirect</h1>
    <div class="error message">Redirect for 'missing-key' not found</div>
  </body>
</html>
```

### Health Check

```
GET /__/health
```

Returns service health status. The health check verifies:
- PostgreSQL database connectivity

**Success Response (200 OK):**
```json
{
  "message": "OK"
}
```

**Failure Response (503 Service Unavailable):**
```json
{
  "message": "Health check failed",
  "code": "HEALTH_CHECK_ERROR"
}
```

## Error Handling

The service provides a clean separation between application errors and HTTP responses:

- `ApplicationError` - Base error class with `code` and `cause` properties
- `ValidationError` (400) - Input validation errors
- `MissingRedirectError` (404) - Redirect not found errors
- `KeyCollisionError` (409) - Key collision errors (extremely rare)
- `HealthCheckError` (503) - Health check failure errors

The `ErrorHandler` middleware catches all errors and maps error codes to HTTP status codes. Application code throws `ApplicationError` instances, and the ErrorHandler translates them to appropriate HTTP responses.

Internal server errors (500) have their messages masked to "Internal Server Error" to avoid leaking infrastructure details. All errors are logged with full details.

To add custom errors, extend `ApplicationError` and add the mapping in `ErrorHandler`.

## License

MIT
