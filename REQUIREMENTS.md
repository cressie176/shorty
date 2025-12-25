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
```

### 2. Shorten URL
Shortens the given URL

#### Acceptance Criteria
- Returns a short key for the given URL
- The short key msut be unique (or have a very high probability of uniqueness), but does not have to be repeatable
- The short key must be url safe
- The short key must not contain rude words
- The short key must be short (max 12 characters)

#### Implementation
**Endpoint**
```
POST /redirect
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
  "key": "11AAAA",
  "url": "https://example.com/path?a=2&z=1"
}
```

**CanonicalUrl class**
- Has a constructor which takes the uncanonical url
- Has a to string function which yields the canonical url

**ShortKey class**
- Has a constructor which takes a string
- Has a to string function which yields the short key
- The short key must be generated at construction time
- Try to find a suitable library

**Redirect Route**
- Contains the POST short route


### 3. Get URL
Returns a URL for the given short key

#### Acceptance Criteria
- Returns the canonical url associated with the given short key
- Responds with 404 for unknown short keys

**Endpoint**
`GET /redirect/:key`

**Response** (200 Success):
```json
{
  "key": "11AAAA",
  "url": "https://example.com/path?a=2&z=1"
}
```

#### Implementation

- Update the POST url to persist the shortkey and canonical url (known as a redirect) in a PostgreSQL database
- The short key must be unique
- The canonical url must be unique
- When inserting new redirects and tolerate duplicate URLS (i.e. ON CONFLICT IGNORE)
- When inserting new redirects raise an exception for duplicate short keys since this would indicate a collision
- Write a concurrency test to check
- Use node-pg rather than an ORM
- Use marv with marv-pg-driver for PostgreSQL migrations

**Redirect schema**
- KEY (string, not null, primary key)
- URL (string, not null, unique)

**Redirect Service**
- storeRedirect (upserts a redirect)
- getRedirect (retrieves a redirect)


### 4. URL Redirection
Redirect requests for a short key to the canonicalised url

#### Acceptance Criteria
- Redirects HTTP requests for a known short key to the canonicalised url
- Responds with 404 for unknown short keys
- Reports key collisions for different canonical urls

**Endpoint**
`GET /r/:key`

#### Implementation

- Add the GET /r/:key route

### 5. Expire Redirects
Automatically expire the redirects when they have not been accessed for a configurable period of time (use one year in non production)

#### Acceptance Criteria
- Requests for redirects that have not been accessed for within the window respond with 404
- Requests for redirects that have been accessed within the window still work

#### Implementation
- Update the production configuration to store the redirect expiry time of one year
- Add an accessed time to the redirect schema (accessed_at, NOT NULL, default to insert time, indexed)
- Update the redirect storage to update the accessed time when a duplicate URL is persisted using ON CONLICT UPDATE
- Update the retrieval process to use a stored procedure which updates the record whenever it is read
- Update retrieval queries to check the accessed time (do not use codebased checks) to exclude redirects that have not been accessed within one year

### 6. Delete Expired Redirects
Automatically delete expired redirects

#### Acceptance Criteria
- Expired redirects are eventually deleted
- If an expired redirect is deleted at the same time that one is stored, the end result is that the redirect will exist (write a concurrency test to check)

#### Implementation
- use a stored procedure triggerd by pg_cron.
- For tests invoke to stored procedure - we will trust pg_cron is configured correctly

**Other**:
- Use UK English not American English
