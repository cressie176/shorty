# URL Shortener - Requirements Document

## Overview
Build a URL shortener service that creates short, unique keys for URLs, persists them in PostgreSQL with automatic expiry, and provides redirection. The application must be developed pragmatically, using test driven development, clean code, clean architecture and using my preferred libraries. These are available from the following skills

  - typescript-tdd-cookbook
  - typescript-service-cookbook
  - javascript-preferred-libraries
  - typescript-clean-code-cookbook
  - postgresql-cookbook
  - typescript-pragmatic-programmer

## Technology Stack
- **Language**: TypeScript (ES Modules)
- **Database**: PostgreSQL

## Stories

### 1. Project Intialisation
Create the project structure and infrastructure

#### Acceptance Criteria
- The application starts from index.ts
- The application provides a healthcheck endpoint to report the current status

#### Implementation

- Create a healthcheck route
- The route should call a database.test() function which runs `SELECT 1`
- Log the cause of any errors, but only respond with a 'Service Unavailable' message and 503

**Endpoint**
```
GET /__/healthcheck
```

**Response** (200 Success)
```json
{
  "message": "OK"
}


### 2. Shorten URL
Shortens the given URL

#### Acceptance Criteria
- Returns a short key for the given URL
- Returns the same short key for equivalent URLs, i.e. the URL should be canonicalised before generating the short key.
- Returns different short keys for different URLs
- The shork key cannot contain rude words

#### Implementation
**Endpoint**
```
POST /short
```

**Payload**
```json
{
  "url": "https://example.com/path?z=1&a=2"
}
```

**Response** (201 Created):
```json
{
  "shortKey": "11AAAA",
  "canonicalUrl": "https://example.com/path?a=2&z=1"
}
```

**CanonicalUrl class**
- Has a constructor which takes the uncanonical url
- Has a to string function which yields the canonical url

**ShortKey class**
- Has a constructor which takes a string
- Has a to string function which yields the short key
- The short key must be generated at construction time by concatenating the current time in seconds and an integer hashcode of the string, then passing them through an upper and lowercast alpha numeric alphabet that excludes all vowels so as to prevent rude words

**Redirect Route**
- Contains the POST short route

### 3. URL Redirection
Redirect requests for a short key to the canonicalised url

#### Acceptance Criteria
- Redirects HTTP requests for a known short key to the canonicalised url
- Responds with 404 for unknown short keys

**Endpoint**
`GET /s/:shortkey`

#### Implementation

- The redirects (shortkey and canonicalised url) must be stored in a PostgreSQL database
- The combination of shortkey and canonicalised url must be unique
- Use an upsert to create new redirects and tolerate duplicate redirects (i.e. ON CONFLICT UPDATE) - write a concurrency test to check
- Use node-pg rather than an ORM
- Use marv with marv-pg-driver for PostgreSQL migrations

** Redirect schema **
- ID (PK, integer)
- KEY (string, required)
- URL (string, required)
- Unique constraint on KEY and URL)
- Separate indexes on KEY and URL

** Redirect Route **
- Add the GET /s/:shortkey route

** Redirect Service **
- storeRedirect (upserts a redirect)
- getRedirect (retrieves a redirect)

### 4. Expire Redirects
Automatically expire the redirects when they have not been accessed for one year or more (configurable)

#### Acceptance Criteria
- Requests for redirects that have not been accessed for one year or over over one year respond with 404
- Requests for redirects that have been accessed within one year still work

#### Implementation
- Add an accessed time to the redirect schema (accessed_at)
- Update the retrieval process to use a stored procedure which updates the record whenever it is read
- Update retrieval queries to check the accessed time (do not use codebased checks) to exclude redirects that have not been accessed within one year

### 5. Delete Expired Redirects
Automatically delete expired redirects

#### Acceptance Criteria
- Expired redirects are eventually deleted
- If an expired redirect is deleted at the same time that one is stored, the end result is that the redirect will exist (write a concurrency test to check)

#### Implementation
- use a stored procedure triggerd by pg_cron.
- For tests invoke to stored procedure - we will trust pg_cron is configured correctly

**Other**:
- Use UK English not American English
