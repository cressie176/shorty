INSERT INTO redirect (key, url, accessed_at, expires_at)
VALUES ($1, $2, NOW(), NOW() + $3::INTERVAL)
ON CONFLICT (url) DO UPDATE SET
  accessed_at = NOW(),
  expires_at = NOW() + $3::INTERVAL
RETURNING key, url
