CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION delete_expired_redirects()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM redirect
  WHERE NOW() >= expires_at;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % expired redirects at %', deleted_count, NOW();

  RETURN deleted_count;
END;
$$;

SELECT cron.schedule(
  'delete-expired-redirects',
  '0 * * * *',
  'SELECT delete_expired_redirects()'
);
