# URL Shortener - Requirements Document

## Overview
Build a URL shortener service called "shorty" that creates short, unique keys for URLs, persists them in PostgreSQL with automatic expiry, and provides redirection. The application must be developed pragmatically, using test-driven development, clean code, clean architecture and using my preferred libraries. These are available from the following skills:

  - typescript-tdd-cookbook
  - typescript-service-cookbook
  - javascript-preferred-libraries
  - typescript-clean-code-cookbook
  - postgresql-cookbook
  - typescript-pragmatic-programmer

## Technology Stack
- **Language**: TypeScript (ES Modules)
- **Database**: PostgreSQL

## Miscellaneous
- Use UK English not American English

## Stories

### 1. Project Initialisation
Create the project structure and infrastructure

#### Acceptance Criteria
- The application starts from index.ts
- The application provides a healthcheck endpoint to report the current status
- When unhealthy, the application logs the cause, but only responds with a 'Service Unavailable' message and 503

#### API Specification
```
GET /__/health
```

*200 OK*
```json
{
  "message": "OK"
}
```

*503 Service Unavailable*
```json
{
  "message": "Service Unavailable",
  "code": "SERVICE_UNAVAILABLE"
}
```

#### Implementation Notes
- Use docker-compose and a custom image based on postgres:18-alpine with pg_cron for local development and testing
- The route should call a database query (e.g. `SELECT 1`) to test availability

### 2. Shorten URL
Shortens the given URL

#### Acceptance Criteria
- Returns a short key for the given URL
- The short key must be unique (or have a very high probability of uniqueness), but does not have to be repeatable
- The short key must be URL safe
- The short key must not contain rude words
- The short key must be 12 characters max

#### API Specification
```
POST /redirect
{
  "url": "https://example.com/path?z=1&a=2"
}
```

*201 Created*
```json
{
  "key": "11AAAA",
  "url": "https://example.com/path?a=2&z=1"
}
```

*400 Bad Request*
```json
{
  "message": "Invalid URL",
  "code": "VALIDATION_ERROR"
}
```

#### Implementation Notes

**CanonicalUrl class**
- Has a constructor which takes the uncanonical URL
- Has a toString function which yields the canonical URL

**Redirect class**
- Has a key property (string)
- Has a url property (CanonicalUrl)

**Redirect Route**
- Contains the POST short route

### 3. Get URL
Returns a URL for the given short key

#### Acceptance Criteria
- Returns the canonical URL associated with the given short key
- Responds with 404 for unknown short keys

#### API Specification
```
GET /redirect/:key
```

*200 OK*
```json
{
  "key": "11AAAA",
  "url": "https://example.com/path?a=2&z=1"
}
```

*404 Not Found*
```json
{
  "message": "Redirect for 'example' not found",
  "code": "NOT_FOUND"
}
```

#### Implementation Notes

- Update the POST URL to persist the short key and canonical URL (known as a redirect) in a PostgreSQL database
- The short key must be unique
- The canonical URL must be unique
- When inserting new redirects tolerate duplicate URLs (i.e. ON CONFLICT UPDATE url RETURNING)
- When inserting new redirects raise an exception for duplicate short keys since this would indicate a collision
- Write a concurrency test to check
- Use node-pg rather than an ORM
- Use marv with marv-pg-driver for PostgreSQL migrations

**Redirect domain object**
- Has a key property (string)
- Has a url property (CanonicalUrl)

**Redirect schema**
- KEY (string, not null, primary key)
- URL (string, not null, unique)

**Redirect Service**
- storeRedirect (upserts a redirect)
- getRedirect (retrieves a redirect)

### 4. URL Redirection
Redirect requests for a short key to the canonicalised URL

#### Acceptance Criteria
- Redirects HTTP requests for a known short key to the canonicalised URL
- Responds with 404 for unknown short keys
- Reports key collisions for different canonical URLs

#### API Specification
```
GET /r/:key
```

*302 Found*
```
Location: https://example.com/path?a=2&z=1
```

*404 Not Found*
```json
{
  "message": "Redirect for 'example' not found",
  "code": "NOT_FOUND"
}
```

#### Implementation Notes

- Add the GET /r/:key route

### 5. Expire Redirects
Automatically expire the redirects when they have not been accessed for a configurable period of time (use one year in non production)

#### Acceptance Criteria
- Requests for redirects that have not been accessed for within the window respond with 404
- Requests for redirects that have been accessed within the window still work

#### Implementation Notes
- Update the production configuration to store the redirect expiry interval of one year
- Add an expiry timestamp to the redirect schema (expires_at, NOT NULL, default to current time plus expiry interval, indexed)
- Update the redirect storage to recalculate the expiry timestamp when a duplicate URL is persisted using ON CONFLICT UPDATE
- Update the retrieval process to use a stored procedure which updates the expiry timestamp whenever the redirect is read
- Update retrieval queries to check the expiry timestamp (do not use code-based checks) to exclude redirects where the current time is after the expiry timestamp

### 6. Delete Expired Redirects
Automatically delete expired redirects

#### Acceptance Criteria
- Expired redirects are eventually deleted
- If an expired redirect is deleted at the same time that one is stored, the end result is that the redirect will exist (write a concurrency test to check)

#### Implementation Notes
- Use a stored procedure triggered by pg_cron at hourly intervals
- For tests invoke the stored procedure - we will trust pg_cron is configured correctly
