CREATE OR REPLACE FUNCTION delete_expired_redirects()
RETURNS INTEGER AS $$
DECLARE
  deleted INTEGER;
BEGIN
  DELETE FROM redirect
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted = ROW_COUNT;

  RETURN deleted;
END;
$$ LANGUAGE plpgsql;
