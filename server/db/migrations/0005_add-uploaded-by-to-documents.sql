-- Add uploadedBy field to documents table and make r2_key unique
-- Also add indexes for r2_key and uploadedBy

ALTER TABLE documents ADD COLUMN uploaded_by TEXT;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS documents_r2_key_idx ON documents(r2_key);
CREATE INDEX IF NOT EXISTS documents_uploaded_by_idx ON documents(uploaded_by);

-- Note: SQLite doesn't support adding NOT NULL constraint after the fact
-- For new deployments, the schema will have NOT NULL
-- For existing data, you may need to update NULL values before enforcing NOT NULL
