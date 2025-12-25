-- Add timestamps to redirect table
ALTER TABLE redirect
  ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN expires_at TIMESTAMP NOT NULL;

CREATE INDEX idx_redirect_expires_at ON redirect(expires_at);

CREATE OR REPLACE FUNCTION get_redirect(
  p_key VARCHAR,
  p_expiry_interval INTERVAL
)
RETURNS TABLE(key VARCHAR, url VARCHAR) AS $$
BEGIN
  RETURN QUERY
  UPDATE redirect
  SET expires_at = NOW() + p_expiry_interval
  WHERE redirect.key = p_key
    AND expires_at > NOW()
  RETURNING redirect.key, redirect.url;
END;
$$ LANGUAGE plpgsql;
