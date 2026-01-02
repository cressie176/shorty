# shorty

[![CI](https://github.com/cressie176/shorty/workflows/CI/badge.svg)](https://github.com/cressie176/shorty/actions)

URL shortener service

## Features

- **Node.js + TypeScript** - Modern ES modules with strict TypeScript configuration
- **Hono Web Framework** - Fast, lightweight web server with type safety
- **PostgreSQL** - PostgreSQL 18 database with connection pooling and migrations
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

### Start PostgreSQL

Start the PostgreSQL database:

```bash
docker compose -f docker/docker-compose.postgres.yml up -d postgres
```

For testing:

```bash
docker compose -f docker/docker-compose.postgres.yml up -d postgres-test
```

Stop the database:

```bash
docker compose -f docker/docker-compose.postgres.yml down
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

Run tests with coverage:

```bash
npm run test:coverage
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
├── src/
│   ├── domain/            # Domain models and business logic
│   │   └── errors/        # Error classes
│   ├── infra/             # Infrastructure (Application, WebServer, Logger, etc.)
│   ├── init/              # Initialization routines
│   ├── middleware/        # HTTP middleware
│   ├── routes/            # HTTP route handlers
│   └── services/          # Service layer
├── test/                  # Test files
├── test-src/              # Test utilities
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

### Redirect Expiry

Redirects automatically expire after a period of inactivity, configured via `redirects.expiryDays` (default: 90 days). The expiry timer resets each time the redirect is accessed via `GET /r/:key`.

## API Endpoints

### Health Check

```
GET /__/health
```

Returns service health status. The health check validates that the database connection is working.

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

When the health check fails (e.g., database connection fails), the detailed error is logged to application logs but only a generic 'Service Unavailable' message is returned to avoid leaking infrastructure details.

### Shorten URL

```
POST /api/redirect
Content-Type: application/json

{
  "url": "https://example.com/path?z=1&a=2"
}
```

Creates a short redirect key for the given URL. URLs are normalised before storage:
- Protocol and host are converted to lowercase
- Default HTTP (80) and HTTPS (443) ports are removed
- Query parameters are sorted alphabetically
- Hashes, subdomains, paths, and trailing slashes are retained

The generated key is 12 characters long, URL-safe, and does not contain rude words.

**Success Response (201 Created):**
```json
{
  "key": "AbC123XyZ789",
  "url": "https://example.com/path?a=2&z=1"
}
```

**Error Response (400 Bad Request):**
```json
{
  "message": "Invalid URL: 'not-a-valid-url'",
  "code": "VALIDATION_ERROR"
}
```

Invalid URLs include:
- Malformed URLs
- URLs with authentication credentials (username/password)
- Non-HTTP(S) protocols

**Error Response (409 Conflict):**
```json
{
  "message": "Collision detected for key 'ABC123'",
  "code": "KEY_COLLISION"
}
```

Returned in the extremely rare case where the same key is generated for different URLs.

### Get URL

```
GET /api/redirect/:key
```

Retrieves the redirect information for a given short key.

**Success Response (200 OK):**
```json
{
  "key": "AbC123XyZ789",
  "url": "https://example.com/path?a=2&z=1"
}
```

**Error Response (404 Not Found):**
```json
{
  "message": "Redirect for 'nonexistent' not found",
  "code": "MISSING_REDIRECT"
}
```

### URL Redirection

```
GET /r/:key
```

Redirects to the normalised URL associated with the short key using a 301 Moved Permanently status. Updates the redirect's access time to reset the expiry period.

Redirects automatically expire after a configurable period of inactivity (default: 90 days). Each access resets the expiry timer.

**Success Response (301 Moved Permanently):**
```
Location: https://example.com/path?a=2&z=1
```

**Error Response (404 Not Found):**

Returns an HTML page when the redirect doesn't exist or has expired:
```html
<html lang="en">
  <head>
    <title>Shorty</title>
  </head>
  <body>
    <h1>Missing Redirect</h1>
    <div class="error message">The redirect for 'missing-key' is missing</div>
  </body>
</html>
```

## Error Handling

The service provides a clean separation between application errors and HTTP responses:

- `ApplicationError` - Base error class with `code` and `cause` properties
- `HealthCheckError` (503) - Health check failure error
- `ValidationError` (400) - Invalid input validation error
- `MissingRedirectError` (404) - Redirect not found error
- `KeyCollisionError` (409) - Key collision detected error

The `ErrorHandler` middleware catches all errors and maps error codes to HTTP status codes. Application code throws `ApplicationError` instances, and the ErrorHandler translates them to appropriate HTTP responses.

Internal server errors (500) have their messages masked to "Internal Server Error" to avoid leaking infrastructure details. All errors are logged with full details.

To add custom errors, extend `ApplicationError` and add the mapping in `ErrorHandler`.

## License

MIT
