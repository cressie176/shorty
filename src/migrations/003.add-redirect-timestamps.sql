-- Add timestamps to redirect table
ALTER TABLE redirect
  ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN accessed_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Create index on accessed_at for efficient expiry queries
CREATE INDEX idx_redirect_accessed_at ON redirect(accessed_at);

-- Create stored procedure to get redirect and update accessed_at atomically
CREATE OR REPLACE FUNCTION get_redirect(
  p_key VARCHAR,
  p_expiry_interval INTERVAL
)
RETURNS TABLE(key VARCHAR, url VARCHAR) AS $$
BEGIN
  RETURN QUERY
  UPDATE redirect
  SET accessed_at = NOW()
  WHERE redirect.key = p_key
    AND accessed_at > NOW() - p_expiry_interval
  RETURNING redirect.key, redirect.url;
END;
$$ LANGUAGE plpgsql;
