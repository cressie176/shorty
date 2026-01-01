CREATE OR REPLACE FUNCTION get_redirect(p_key TEXT, p_expiry INTERVAL)
RETURNS TABLE(key TEXT, url TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE redirect
  SET
    accessed_at = NOW(),
    expires_at = NOW() + p_expiry
  WHERE redirect.key = p_key
    AND NOW() < expires_at
  RETURNING redirect.key, redirect.url;
END;
$$;
