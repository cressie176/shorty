SELECT cron.schedule(
  'vacuum-analyze-redirects',
  '0 3 * * *',
  $$CALL vacuum_analyze_redirects()$$
);
