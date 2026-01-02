-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule VACUUM ANALYZE to run daily at 3am
SELECT cron.schedule(
  'vacuum-analyze-redirects',
  '0 3 * * *',
  'VACUUM ANALYZE redirects'
);
