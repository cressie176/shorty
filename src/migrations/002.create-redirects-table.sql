CREATE TABLE redirects (
  key VARCHAR(12) PRIMARY KEY,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_redirects_created_at ON redirects(created_at);
