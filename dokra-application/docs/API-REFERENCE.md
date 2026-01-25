# API Reference

## Overview

Dokra backend runs on Nuxt 4/Nitro + Cloudflare Workers. All API routes are in `/server/api/`. Authentication via BetterAuth session cookies.

---

## Authentication

### GET /api/auth/get-session
Retrieve current user session.

**Response (200)**:
```json
{
  "session": { "id": "...", "userId": "...", "expiresAt": "..." },
  "user": { "id": "...", "email": "...", "name": "..." }
}
```

### POST /api/auth/[...all]
BetterAuth routes. Handles sign-in, sign-up, sign-out, OAuth flows.

---

## Documents

### GET /api/documents
List documents for an organization.

**Query Params**:
- `organizationId` (required): Org ID
- `search`: Filter by title
- `documentType`: Filter by type (invoice, contract, etc.)
- `status`: Filter by status (inbox, verified, archived)
- `tagIds`: Comma-separated tag IDs to filter by
- `limit`: Results per page (1-100, default 50)
- `offset`: Pagination offset (default 0)

**Response (200)**:
```json
{
  "documents": [
    {
      "id": "...",
      "title": "...",
      "fileName": "...",
      "mimeType": "...",
      "fileSize": 12345,
      "documentType": "invoice",
      "status": "inbox",
      "extractedText": "...",
      "dueDate": "2026-02-01",
      "uploadedBy": "user-id",
      "createdAt": "2026-01-20T10:00:00Z",
      "updatedAt": "2026-01-20T10:00:00Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

**Errors**:
- 400: Missing organizationId
- 401: Not authenticated
- 403: No access to organization

### POST /api/documents
Create document with file upload.

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `file` (required): File to upload
- `organizationId` (required): Org ID
- `title` (optional): Document title (defaults to filename)
- `documentType` (optional): Type of document
- `documentDate` (optional): Document date (ISO format)

**Response (201)**:
```json
{
  "id": "doc-123",
  "title": "Invoice.pdf",
  "fileName": "Invoice.pdf",
  "fileSize": 54321,
  "r2Key": "org-id/doc-123/Invoice.pdf",
  "status": "inbox",
  "createdAt": "2026-01-20T10:00:00Z"
}
```

**Errors**:
- 400: Invalid file or missing fields
- 401: Not authenticated
- 413: File too large

### GET /api/documents/[id]
Get document details.

**Response (200)**:
```json
{
  "id": "...",
  "title": "...",
  "status": "...",
  "extractedText": "...",
  "documentType": "...",
  "dueDate": "...",
  "reminderDaysBeforeDue": 7,
  "tags": ["tag-1", "tag-2"],
  "metadata": {},
  "createdAt": "...",
  "updatedAt": "..."
}
```

### PATCH /api/documents/[id]
Update document metadata (status, title, tags, etc.).

**Request Body**:
```json
{
  "title": "...",
  "status": "verified",
  "documentType": "invoice",
  "dueDate": "2026-02-01",
  "reminderDaysBeforeDue": 7,
  "tags": ["tag-1", "tag-2"],
  "metadata": { "customField": "value" }
}
```

**Response (200)**: Updated document object.

### DELETE /api/documents/[id]
Delete (soft delete) a document.

**Response (200)**:
```json
{ "success": true }
```

### GET /api/documents/stats
Get organization document stats.

**Query Params**:
- `organizationId` (required): Org ID

**Response (200)**:
```json
{
  "totalDocuments": 42,
  "byStatus": { "inbox": 10, "verified": 20, "archived": 12 },
  "byType": { "invoice": 20, "contract": 15, "other": 7 },
  "totalStorageBytes": 12345678,
  "lastUploadedAt": "2026-01-20T10:00:00Z"
}
```

### GET /api/documents/[id]/download
Download document file. The server returns a proxy URL that streams the file through the backend.

**Response (200)**:
```json
{
  "url": "/api/files/proxy/{id}?download=true",
  "fileName": "Invoice.pdf"
}
```

Note: The low-level proxy endpoint `/api/files/proxy/{id}` streams the object from Cloudflare R2 and sets the following headers when returning files: `Content-Type`, `Content-Length`, optional `ETag`, `Content-Disposition` (attachment when `?download=true`, otherwise `inline`), and `Cache-Control: private, max-age=3600`.

---

## Files

### GET /api/files
List files for an organization.

**Query Params**:
- `organizationId` (required): Org ID
- `documentId` (optional): Filter by associated document
- `limit`: Results per page (default 50)
- `offset`: Pagination offset (default 0)

**Response (200)**:
```json
{
  "files": [
    {
      "id": "file-123",
      "fileName": "report.pdf",
      "originalName": "Report_2026.pdf",
      "mimeType": "application/pdf",
      "fileSize": 123456,
      "r2Key": "org-id/file-123/report.pdf",
      "status": "active",
      "uploadedBy": "user-id",
      "uploadedAt": "2026-01-20T10:00:00Z",
      "documentId": "doc-123"
    }
  ],
  "total": 10,
  "limit": 50,
  "offset": 0
}
```

### POST /api/files/upload
Upload a file to R2.

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `file` (required): File to upload
- `organizationId` (required): Org ID
- `documentId` (optional): Associate with document

**Response (201)**:
```json
{
  "id": "file-123",
  "fileName": "report.pdf",
  "fileSize": 123456,
  "r2Key": "org-id/file-123/report.pdf",
  "downloadUrl": "/api/files/proxy/file-123?download=true",
  "uploadedAt": "2026-01-20T10:00:00Z"
}
```

### GET /api/files/[id]
Get file metadata.

**Response (200)**: File object (see POST response).

### DELETE /api/files/[id]
Delete a file from R2 and database.

**Response (200)**:
```json
{ "success": true }
```

---

## Tags

### GET /api/tags
List tags for an organization.

**Query Params**:
- `organizationId` (required): Org ID

**Response (200)**:
```json
{
  "tags": [
    {
      "id": "tag-1",
      "name": "Invoice",
      "color": "#3b82f6",
      "documentCount": 20,
      "createdAt": "2026-01-20T10:00:00Z"
    }
  ]
}
```

### POST /api/tags
Create a new tag.

**Request Body**:
```json
{
  "organizationId": "org-id",
  "name": "Invoice",
  "color": "#3b82f6"
}
```

**Response (201)**: Tag object (see GET response).

### PATCH /api/tags/[id]
Update tag.

**Request Body**:
```json
{
  "name": "Invoices",
  "color": "#ef4444"
}
```

**Response (200)**: Updated tag object.

### DELETE /api/tags/[id]
Delete tag.

**Response (200)**:
```json
{ "success": true }
```

---

## Organizations

### GET /api/organization
List organizations for current user.

**Response (200)**:
```json
{
  "organizations": [
    {
      "id": "org-1",
      "name": "Personal",
      "ownerId": "user-id",
      "role": "owner",
      "createdAt": "2026-01-20T10:00:00Z"
    }
  ]
}
```

### POST /api/organization
Create a new organization.

**Request Body**:
```json
{
  "name": "My Company"
}
```

**Response (201)**: Organization object.

### GET /api/organization/[id]
Get organization details.

**Response (200)**: Organization object with members list.

### PATCH /api/organization/[id]
Update organization.

**Request Body**:
```json
{
  "name": "New Name"
}
```

**Response (200)**: Updated organization object.

---

## Users

### GET /api/users/me
Get current user profile.

**Response (200)**:
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "John Doe",
  "image": "https://...",
  "createdAt": "2026-01-20T10:00:00Z"
}
```

### PATCH /api/users/me
Update current user profile.

**Request Body**:
```json
{
  "name": "Jane Doe",
  "image": "base64-encoded-image"
}
```

**Response (200)**: Updated user object.

---

## Search

### GET /api/search
Full-text + semantic search across documents.

**Query Params**:
- `q` (required): Search query
- `organizationId` (required): Org ID
- `limit`: Results per page (default 25)
- `offset`: Pagination offset (default 0)

**Response (200)**:
```json
{
  "results": [
    {
      "id": "doc-1",
      "title": "Invoice",
      "snippet": "...matching text...",
      "relevance": 0.95,
      "documentType": "invoice"
    }
  ],
  "total": 5,
  "query": "invoice"
}
```

---

## Error Handling

All errors return JSON with consistent format:

```json
{
  "status": 400,
  "statusText": "Bad Request",
  "message": "Human-readable error details"
}
```

**Common Status Codes**:
- 200: Success
- 201: Created
- 400: Bad Request (validation error, missing fields)
- 401: Unauthorized (no session/auth token)
- 403: Forbidden (no access to resource)
- 404: Not Found
- 500: Server Error

---

## Authentication Headers

Most endpoints require an active session. Session is managed via HTTP-only cookies set by BetterAuth.

**No explicit Authorization header needed** — cookies are sent automatically by the browser.

For API clients (e.g., curl, Postman), ensure cookies are included:

```bash
curl -H "Cookie: auth_session=..." https://api.example.com/api/documents
```
