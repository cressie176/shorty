CREATE OR REPLACE PROCEDURE vacuum_analyze_redirects()
LANGUAGE plpgsql AS $$
BEGIN
  VACUUM ANALYZE redirect;
END;
$$;
