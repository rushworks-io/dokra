ALTER TABLE tags
    ADD COLUMN category TEXT NOT NULL DEFAULT 'general';

UPDATE tags
SET color = '#3b82f6'
WHERE color IS NULL OR color = 'blue';

CREATE INDEX IF NOT EXISTS tags_org_name_idx ON tags(organization_id, name);

CREATE TABLE IF NOT EXISTS document_tags (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);

CREATE INDEX IF NOT EXISTS document_tags_org_idx ON document_tags(organization_id);
CREATE INDEX IF NOT EXISTS document_tags_document_idx ON document_tags(document_id);
CREATE INDEX IF NOT EXISTS document_tags_tag_idx ON document_tags(tag_id);
