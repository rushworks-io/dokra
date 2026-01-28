-- Migration: Add file encryption IV and tag to document_keys table
-- These columns store the IV and authentication tag used for encrypting the actual file content
-- (separate from the DEK wrapping IV/tag which are already stored)

ALTER TABLE document_keys ADD COLUMN file_iv TEXT;
ALTER TABLE document_keys ADD COLUMN file_tag TEXT;
