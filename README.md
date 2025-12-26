# Shorty - URL Shortener Service

A URL shortener service that creates short, unique keys for URLs, persists them in PostgreSQL with automatic expiry, and provides redirection.

## Features

- **URL Shortening**: Create short, URL-safe keys for long URLs
- **URL Canonicalisation**: Automatically normalises URLs (query parameter ordering, trailing slashes)
- **Automatic Expiry**: Redirects expire after configurable period of inactivity
- **Expiry Extension**: Accessing a redirect extends its expiry window
- **Automatic Cleanup**: Expired redirects are automatically deleted
- **Database Maintenance**: Scheduled VACUUM ANALYZE maintains query performance
- **Health Checks**: Monitor service and database availability

## Technology Stack

- **Language**: TypeScript (ES Modules)
- **Runtime**: Node.js
- **Web Framework**: Hono
- **Database**: PostgreSQL 18 with pg_cron extension
- **Database Driver**: node-pg
- **Migrations**: marv with marv-pg-driver

## Prerequisites

- Node.js 20 or higher
- Docker and Docker Compose
- PostgreSQL (via Docker)

## Installation

```bash
npm install
```

## Configuration

Configuration is managed through JSON files in the `config/` directory:

- `config/default.json` - Default configuration for all environments
- `config/local.json` - Local development overrides (gitignored)
- `config/test.json` - Test environment configuration

### Configuration Options

```json
{
  "server": {
    "port": 3000                           // HTTP server port
  },
  "database": {
    "host": "localhost",                   // PostgreSQL host
    "port": 5432,                          // PostgreSQL port
    "database": "shorty",                  // Database name
    "user": "shorty",                      // Database user
    "password": "password",                // Database password
    "min": 1,                              // Minimum pool connections
    "max": 10,                             // Maximum pool connections
    "idleTimeoutMillis": 30000,            // Connection idle timeout
    "connectionTimeoutMillis": 2000,       // Connection timeout
    "application_name": "shorty",          // Application name in PostgreSQL
    "migrations": {
      "apply": false,                      // Auto-apply migrations on startup
      "directory": "src/migrations"        // Migrations directory
    }
  },
  "logging": {
    "level": "info"                        // Log level (debug, info, warn, error)
  },
  "redirect": {
    "expiryInterval": "1 year"             // Redirect expiry interval (PostgreSQL interval syntax)
  }
}
```

### Environment Variables

- `APP_ENV` - Application environment (defaults to 'local')
  - `local` - Local development (uses default.json + local.json)
  - `test` - Test environment (uses default.json + test.json)

## Database Setup

### Starting the Database

```bash
# Start PostgreSQL for development
docker compose up -d postgres

# Start PostgreSQL for testing
docker compose --profile test up -d postgres-test
```

The PostgreSQL container includes the pg_cron extension for scheduled tasks.

### Running Migrations

```bash
npm run db:migrate
```

Migrations are stored in `src/migrations/` and are applied in order:

1. `001.create-nuke-function.sql` - Creates database reset function (test only)
2. `002.create-redirect-table.sql` - Creates redirect table with unique constraints
3. `003.add-redirect-timestamps.sql` - Adds expiry timestamp column
4. `004.create-delete-expired-redirects-procedure.sql` - Creates cleanup function
5. `005.schedule-delete-expired-redirects-job.sql` - Schedules hourly cleanup
6. `006.create-vacuum-analyze-redirects-procedure.sql` - Creates maintenance procedure
7. `007.schedule-vacuum-analyze-redirects-job.sql` - Schedules daily maintenance

## Running the Application

### Development Mode

```bash
npm run dev
```

Runs the application with hot-reloading enabled.

### Production Build

```bash
npm run build
node dist/index.js
```

### Running Tests

```bash
npm test                    # Run all tests
npm run test:match <pattern>  # Run tests matching pattern
```

Tests use a separate database instance (postgres-test) running on port 5433.

## API Reference

### Health Check

Check service and database health.

**Request:**
```http
GET /__/health
```

**Response (Success):**
```json
200 OK
{
  "message": "OK"
}
```

**Response (Failure):**
```json
503 Service Unavailable
{
  "message": "Service Unavailable",
  "code": "SERVICE_UNAVAILABLE"
}
```

### Create Short URL

Creates a short key for the given URL.

**Request:**
```http
POST /redirect
Content-Type: application/json

{
  "url": "https://example.com/path?z=1&a=2"
}
```

**Response (Success):**
```json
201 Created
{
  "key": "11AAAA",
  "url": "https://example.com/path?a=2&z=1"
}
```

**Response (Invalid URL):**
```json
400 Bad Request
{
  "message": "Invalid URL",
  "code": "VALIDATION_ERROR"
}
```

**Response (Key Collision - extremely rare):**
```json
409 Conflict
{
  "message": "Collision detected for key 'ABC123'",
  "code": "KEY_COLLISION"
}
```

**Behaviour:**
- URLs are canonicalised (query parameters sorted, trailing slashes removed)
- Short keys are URL-safe, maximum 12 characters
- Short keys are filtered to exclude rude words
- If the same URL is submitted multiple times, the existing redirect is returned
- Redirects expire after the configured interval (default: 1 year)

### Get Redirect Information

Retrieves the URL associated with a short key.

**Request:**
```http
GET /redirect/:key
```

**Response (Success):**
```json
200 OK
{
  "key": "11AAAA",
  "url": "https://example.com/path?a=2&z=1"
}
```

**Response (Not Found):**
```json
404 Not Found
{
  "message": "Redirect for 'example' not found",
  "code": "NOT_FOUND"
}
```

### URL Redirection

Redirects to the URL associated with the short key.

**Request:**
```http
GET /r/:key
```

**Response (Success):**
```http
302 Found
Location: https://example.com/path?a=2&z=1
```

**Response (Not Found):**
```json
404 Not Found
{
  "message": "Redirect for 'example' not found",
  "code": "NOT_FOUND"
}
```

**Behaviour:**
- Accessing a redirect extends its expiry by the configured interval
- Expired redirects return 404 Not Found

## Database Maintenance

### Automatic Expiry

Redirects expire after the configured interval (default: 1 year) of inactivity. The expiry timer is reset each time the redirect is accessed.

### Automatic Cleanup

A pg_cron job runs hourly (at 55 minutes past each hour) to delete expired redirects from the database. This is handled by the `delete_expired_redirects()` stored function.

### Query Performance Maintenance

PostgreSQL's autovacuum only runs when the ratio of dead to live tuples reaches a threshold. In scenarios where redirects are created but rarely accessed (causing expiry updates), the threshold may never be reached, leading to stale query planner statistics and poor performance.

To address this, a pg_cron job runs daily at 3am to execute `VACUUM ANALYZE` on the redirect table. This operation:

- **Reclaims storage**: Removes dead tuples from the table
- **Updates statistics**: Ensures the query planner has accurate data
- **Non-blocking**: Uses regular VACUUM (not VACUUM FULL), allowing normal read/write operations to continue
- **Scheduled off-peak**: Runs at 3am to minimise impact on production traffic

The maintenance is performed by the `vacuum_analyze_redirects()` stored procedure.

## Scripts

- `npm run dev` - Start development server with hot-reloading
- `npm test` - Run all tests
- `npm run test:match <pattern>` - Run tests matching pattern
- `npm run build` - Build TypeScript to JavaScript
- `npm run lint` - Check code quality with Biome
- `npm run lint:fix` - Fix code quality issues automatically
- `npm run db:migrate` - Apply database migrations

## Architecture

The application follows clean architecture principles with clear separation of concerns:

- **Domain Layer** (`src/domain/`): Core business logic and domain models
  - `CanonicalUrl.ts` - URL canonicalisation and validation
  - `Redirect.ts` - Redirect entity with key and URL

- **Services Layer** (`src/services/`): Business logic and data access
  - `RedirectService.ts` - Redirect creation, retrieval, and expiry management

- **Routes Layer** (`src/routes/`): HTTP endpoints
  - `status.ts` - Health check endpoint
  - `redirect.ts` - Redirect creation, retrieval, and redirection endpoints

- **Infrastructure Layer** (`src/infra/`): Framework and database integration
  - `Application.ts` - Application lifecycle management
  - `WebServer.ts` - Hono web server setup
  - `Database.ts` - PostgreSQL connection pool
  - `Configuration.ts` - Configuration loading
  - `Logger.ts` - Structured logging

- **Middleware** (`src/middleware/`): Cross-cutting concerns
  - `ErrorHandler.ts` - Centralised error handling

## Error Handling

The application uses custom error classes for different failure scenarios:

- `ValidationError` - Invalid input (400 Bad Request)
- `NotFoundError` - Resource not found (404 Not Found)
- `ServiceUnavailableError` - Service unavailable (503 Service Unavailable)
- `ApplicationError` - Base error class for application errors

Error responses follow a consistent format:
```json
{
  "message": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE"
}
```

Detailed error information is logged but not exposed to clients to avoid leaking infrastructure details.

## Development

### Code Quality

The project uses Biome for linting and formatting:

```bash
npm run lint        # Check code
npm run lint:fix    # Fix issues automatically
```

### Git Hooks

Lefthook runs pre-commit checks to ensure code quality and test coverage.

## Licence

ISC
