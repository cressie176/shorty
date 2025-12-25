INSERT INTO redirect (key, url, expires_at)
VALUES ($1, $2, NOW() + $3::INTERVAL)
ON CONFLICT (url) DO UPDATE SET expires_at = NOW() + $3::INTERVAL
RETURNING key, url
