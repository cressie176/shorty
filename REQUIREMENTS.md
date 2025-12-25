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
- The application starts from index.ts as the entry point
- The application provides a healthcheck endpoint to report the current status
- When the healthcheck succeeds, respond with 200 OK and a success message
- When the healthcheck fails (e.g., database connection fails), log the detailed error to application logs but only respond to the client with a generic 'Service Unavailable' message and 503 status code to avoid leaking infrastructure details
- The README covers all functionality described in this story, i.e.
  - What the service does
  - How to maintain it (what the scripts do etc)
  - The configuration (up to this point)
  - The API (up to this point)

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
- Use docker-compose and a custom Docker image based on postgres:18-alpine with pg_cron extension installed for local development and testing
- The healthcheck route should execute a simple database query (e.g., SELECT 1) to verify database connectivity and availability
- If the database query succeeds, return 200 OK
- If the database query fails or times out, log the error details and return 503 Service Unavailable

### 2. Shorten URL
Shortens the given URL

#### Acceptance Criteria
- Returns a short key for the given URL
- The short key must be unique (or have a very high probability of uniqueness), but does not have to be repeatable
- The short key must be URL safe
- The short key must not contain rude words
- The short key must be 12 characters max
- The README covers all functionality described in this story, i.e.
  - The short key constraints
  - The API (up to this point)

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
- This story focuses on the domain logic for generating short keys and canonicalising URLs
- Persistence is not required in this story - it will be added in Story 3
- Return the redirect response directly from the route without storing it

**CanonicalUrl domain class**
- Has a constructor which takes the uncanonical URL and canonicalises it (normalises query parameter order, removes trailing slashes, etc.)
- Has a toString function which yields the canonical URL string
- Throws a validation error if the URL is invalid

**Redirect domain class**
- Has a key property (string) containing the generated short key
- Has a url property (CanonicalUrl) containing the canonicalised URL

**Redirect service**
- Generates URL-safe short keys with maximum length of 12 characters
- Ensures keys have a very high probability of uniqueness (e.g., using nanoid or similar)
- Filters out generated keys that contain rude words

**Redirect Route**
- Contains the POST /redirect route
- Validates the incoming URL
- Creates a CanonicalUrl instance
- Generates a short key using ShortKeyGenerator
- Creates a Redirect domain object
- Returns the redirect response

### 3. Get URL
Returns a URL for the given short key

#### Acceptance Criteria
- Returns the canonical URL associated with the given short key
- Responds with 404 for unknown short keys
- The README covers all functionality described in this story, i.e.
  - The API (up to this point)

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
- When inserting new redirects tolerate duplicate URLs by using an upsert operation
  This ensures that if a URL already exists, the existing redirect is returned rather than creating a duplicate
- When inserting new redirects, if a duplicate short key is detected (different URL with same key), allow the database constraint to fail naturally, resulting in a PostgreSQL unique constraint violation error. This error should be caught and re-thrown as a domain-specific error indicating a key collision
- Write a concurrency test to verify that multiple simultaneous requests to shorten the same URL result in the same redirect being returned without errors
- Use node-pg rather than an ORM
- Use marv with marv-pg-driver for PostgreSQL migrations

**Database schema**
- Table name: `redirect`
- Columns:
  - `key`: TEXT, NOT NULL, PRIMARY KEY (the short key)
  - `url`: TEXT, NOT NULL, UNIQUE (the canonical URL)

**RedirectStore service**
- Method: `storeRedirect(key: string, url: CanonicalUrl): Promise<Redirect>`
  - Upserts a redirect into the database
  - If the URL already exists, returns the existing redirect
  - If the key already exists with a different URL, throws a key collision error
- Method: `getRedirect(key: string): Promise<Redirect | null>`
  - Retrieves a redirect by its key
  - Returns null if not found

### 4. URL Redirection
Redirect requests for a short key to the canonicalised URL

#### Acceptance Criteria
- Redirects HTTP requests for a known short key to the canonicalised URL using a 302 Found status
- Responds with 404 for unknown short keys
- When storing redirects, if a key collision occurs (same key generated for different URLs), the system must detect this and handle it appropriately (this should be extremely rare given proper key generation)

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

- Add the GET /r/:key route that:
  - Retrieves the redirect using the RedirectStore service
  - If found, responds with 302 Found status and sets the Location header to the canonical URL
  - If not found, responds with 404 Not Found and an appropriate error message

### 5. Expire Redirects
Automatically expire the redirects when they have not been accessed for a configurable period of time

#### Acceptance Criteria
- Requests for redirects that have not been accessed within the configured expiry window respond with 404
- Requests for redirects that have been accessed within the configured expiry window still work and extend the expiry window

#### Implementation Notes
- Add a configuration parameter for the redirect expiry interval:
  - Production environment: set to one year
  - Non-production environments: set to a shorter duration for testing (e.g., one hour or one day)
- Add an expiry timestamp column to the redirect schema with the following properties:
  - Column name: `expires_at`
  - Type: `TIMESTAMP WITH TIME ZONE`
  - Constraint: `NOT NULL`
  - Default value: current database timestamp plus the configured expiry interval
  - Add an index on this column for efficient expiry queries
- Update the redirect storage to recalculate the expiry timestamp when a duplicate URL is persisted:
  - Use an INSERT statement with ON CONFLICT (url) DO UPDATE clause
  - When a conflict occurs, update the expires_at column to the current timestamp plus the expiry interval
  - Return the key, url, and expires_at columns
- Create a stored procedure called `get_redirect` that atomically:
  - Accepts a key parameter and expiry interval parameter
  - Retrieves the redirect matching the given key where the current timestamp is less than or equal to expires_at
  - Updates the expires_at column to current timestamp plus the expiry interval (extending the expiry)
  - Returns the redirect record (key, url, expires_at) if found and not expired
  - Returns nothing if the redirect is not found or has expired
- All redirect retrieval queries must use database-level checks (WHERE clauses or stored procedure logic) to exclude expired redirects. Never filter expired redirects in application code

### 6. Delete Expired Redirects
Automatically delete expired redirects

#### Acceptance Criteria
- Expired redirects are eventually deleted from the database
- If an expired redirect is being deleted at the same time that a new redirect with the same URL is being stored, the end result must be that the new redirect exists in the database with a fresh expiry timestamp
- Write a concurrency test that simulates this race condition by running both operations simultaneously and verifying the redirect exists afterwards

#### Implementation Notes
- Create a stored procedure called `delete_expired_redirects` that:
  - Deletes all redirects where the current timestamp is greater than expires_at
  - Returns the count of deleted rows
- Configure pg_cron to invoke this stored procedure at hourly intervals
- In tests, invoke the stored procedure directly to verify deletion behaviour. Trust that pg_cron scheduling is configured correctly in production
- The stored procedure should use appropriate locking or isolation levels to handle concurrent operations safely
