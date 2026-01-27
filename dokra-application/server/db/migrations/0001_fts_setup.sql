CREATE VIRTUAL TABLE documents_fts USING fts5(documentId, title, extractedText);
--> statement-breakpoint
CREATE TRIGGER documents_fts_insert AFTER INSERT ON documents BEGIN INSERT INTO documents_fts(documentId, title, extractedText) VALUES (new.id, new.title, new.extracted_text); END;
--> statement-breakpoint
CREATE TRIGGER documents_fts_update AFTER UPDATE ON documents BEGIN UPDATE documents_fts SET title = new.title, extractedText = new.extracted_text WHERE documentId = new.id; END;
--> statement-breakpoint
CREATE TRIGGER documents_fts_delete AFTER DELETE ON documents BEGIN DELETE FROM documents_fts WHERE documentId = old.id; END;
--> statement-breakpoint
INSERT INTO documents_fts(documentId, title, extractedText) SELECT id, title, extracted_text FROM documents;
--> statement-breakpoint