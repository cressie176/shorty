DO $$
BEGIN
  IF current_setting('app.allow_nuke', true) = 'true' THEN
    CREATE OR REPLACE FUNCTION nuke_data()
    RETURNS void
    LANGUAGE plpgsql
    AS $func$
    DECLARE
      table_names text;
    BEGIN
      SET session_replication_role = replica;

      SELECT string_agg(tablename, ', ')
      INTO table_names
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename != 'migrations';

      -- Truncate all tables if any exist
      IF table_names IS NOT NULL THEN
        RAISE NOTICE 'Nuking tables: %', table_names;
        EXECUTE 'TRUNCATE ' || table_names || ' RESTART IDENTITY CASCADE';
      END IF;

      SET session_replication_role = DEFAULT;
    END;
    $func$;
  END IF;
END;
$$;
