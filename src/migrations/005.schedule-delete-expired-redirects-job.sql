CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'delete-expired-redirects',
  '55 * * * *',
  $$SELECT delete_expired_redirects()$$
);
