SELECT cron.schedule(
  'vacuum-analyze-redirect',
  '0 3 * * *',
  'VACUUM ANALYZE redirect'
);
