# 003-Photo Upload API

This document describes the API for handling photo uploads, focusing on scalability and client-agnostic design.

## Endpoint: POST /v1/photos/upload

Upload photos for verification. Supports multiple clients, including web, mobile, and IoT devices, by allowing different content types.

### Request

#### Supported Content Types
- **multipart/form-data**: For traditional web and mobile clients.
- **application/json**: For clients sending Base64-encoded images.
- **application/octet-stream**: For binary uploads (e.g., direct streams).

#### Parameters

| Name    | Type   | Required | Description                                               |
|---------|--------|----------|-----------------------------------------------------------|
| photo   | File   | Yes      | The photo to upload (JPEG or PNG, max 5MB)                |
| type    | String | No       | Type of photo: 'id' or 'selfie' (optional, auto-inferred) |

#### Example Requests

##### Using multipart/form-data
```bash
curl -X POST \
  'http://api.example.com/v1/photos/upload' \
  -H 'Authorization: Bearer <token>' \
  -F 'photo=@/path/to/photo.jpg' \
  -F 'type=id'
```

##### Using application/json
```bash
curl -X POST \
  'http://api.example.com/v1/photos/upload' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "photo": "<Base64-encoded image>",
    "type": "selfie"
  }'
```

##### Using application/octet-stream
```bash
curl -X POST \
  'http://api.example.com/v1/photos/upload' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/octet-stream' \
  --data-binary @/path/to/photo.jpg
```

### Response

#### Success Response (200 OK)
```json
{
  "success": true,
  "key": "uploads/ids/550e8400-e29b-41d4-a716-446655440000",
  "message": "Photo uploaded successfully",
  "validationDetails": {
    "isValid": true,
    "qualityMetrics": {
      "dimensions": {
        "width": 1024,
        "height": 768
      },
      "blur": {
        "isAcceptable": true,
        "value": 0.2
      },
      "lighting": {
        "isAcceptable": true,
        "value": 120
      }
    }
  },
  "extractedData": {
    "fields": {
      "documentNumber": "***4567",
      "name": "John Doe",
      "dateOfBirth": "**/**/1990"
    },
    "confidence": 0.95
  }
}
```

#### Error Responses

##### Standard Error Schema
```json
{
  "error": "Error message",
  "details": {
    "field": "Additional information about the error"
  },
  "code": 400
}
```

##### Specific Errors
- **400 Bad Request**: Missing required fields, invalid input.
- **415 Unsupported Media Type**: Invalid file format.
- **413 Payload Too Large**: File size exceeds limit.
- **429 Too Many Requests**: Rate limit exceeded.
- **500 Internal Server Error**: Processing failed.

### Security Features

1. **Image Validation**
   - Format verification (JPEG/PNG only).
   - Size limits (max 5MB).
   - Resolution requirements (min 640x480).
   - Quality checks (blur detection, lighting assessment).

2. **Document Authentication**
   - Hologram detection.
   - Template matching.
   - Security feature verification.
   - Manipulation detection.

3. **Data Protection**
   - Server-side encryption (AWS KMS).
   - PII data tagging.
   - Sensitive data masking.
   - Secure metadata handling.

4. **Rate Limiting**
   - 10 requests per minute per IP address.
   - 100 requests per hour per user.

5. **Retry Logic**
   - S3 uploads implement retry logic with exponential backoff to handle transient failures.

### Metadata Normalization

Uploaded files include the following metadata:
- `uploadDate`: Timestamp of the upload.
- `documentHash`: Hash of the uploaded document for integrity checks.
- `validationResults`: Results of quality and authenticity checks.
- `extractedFields`: Extracted fields for ID documents.
- `geoLocation`: Optional, if provided by the client.

### Audit Logging

- Comprehensive event logging.
- Request and response tracking.
- Processing results.
- Error tracking.

### Testing Requirements

1. Test different content types (`multipart/form-data`, `application/json`, `application/octet-stream`).
2. Test edge cases (missing fields, invalid formats, large files).
3. Verify rate limit enforcement.
4. Validate retry logic for S3 uploads.
5. Ensure proper handling of various error scenarios.

---
This API design ensures scalability, flexibility, and consistency with the broader project requirements.

