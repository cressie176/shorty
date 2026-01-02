ALTER TABLE redirects ADD COLUMN accessed_at TIMESTAMPTZ;

-- Set accessed_at to created_at for existing records
UPDATE redirects SET accessed_at = created_at WHERE accessed_at IS NULL;

-- Make accessed_at NOT NULL after setting existing values
ALTER TABLE redirects ALTER COLUMN accessed_at SET NOT NULL;

-- Add index for efficient queries on accessed_at
CREATE INDEX idx_redirects_accessed_at ON redirects(accessed_at);
