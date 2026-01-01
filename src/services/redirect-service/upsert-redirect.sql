INSERT INTO redirect (key, url)
VALUES ($1, $2)
ON CONFLICT (url) DO UPDATE SET url = EXCLUDED.url
RETURNING key, url
