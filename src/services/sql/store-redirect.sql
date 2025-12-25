INSERT INTO redirect (key, url)
VALUES ($1, $2)
ON CONFLICT (url) DO UPDATE SET accessed_at = NOW()
RETURNING key, url
