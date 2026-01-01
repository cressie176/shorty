BEGIN;

ALTER TABLE redirect
ADD COLUMN accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 day';

ALTER TABLE redirect ALTER COLUMN expires_at DROP DEFAULT;

CREATE INDEX idx_redirect_accessed_at ON redirect(accessed_at);
CREATE INDEX idx_redirect_expires_at ON redirect(expires_at);

COMMIT;
