-- Add status field to documents table for inbox/verified workflow
ALTER TABLE documents
    ADD COLUMN status TEXT NOT NULL DEFAULT 'inbox';

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS documents_status_idx ON documents(status);
