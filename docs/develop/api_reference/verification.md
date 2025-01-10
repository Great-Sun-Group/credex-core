# Verification API Reference

## Photo Upload API

Upload and validate photos for identity verification.

### POST /v1/verification/upload

Upload a photo for verification purposes. Supports both ID documents and selfie photos.

#### Request

- Content-Type: `multipart/form-data`

##### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| photo | File | Yes | The photo file to upload (JPEG or PNG, max 5MB) |
| type | String | Yes | Type of photo: 'id' or 'selfie' |

##### Example Request
```bash
curl -X POST \
  'http://api.example.com/v1/verification/upload' \
  -H 'Authorization: Bearer <token>' \
  -F 'photo=@/path/to/photo.jpg' \
  -F 'type=id'
```

#### Response

##### Success Response (200 OK)
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

##### Error Responses

###### Bad Request (400)
```json
{
  "error": "Missing required fields"
}
```

```json
{
  "error": "File must be JPG or PNG",
  "details": {
    "type": "image/gif"
  }
}
```

```json
{
  "error": "File size exceeds 5MB limit",
  "details": {
    "size": 6291456
  }
}
```

```json
{
  "error": "Image resolution must be at least 640x480",
  "details": {
    "width": 320,
    "height": 240
  }
}
```

```json
{
  "error": "Document authenticity check failed",
  "details": {
    "hologramDetection": false,
    "templateMatching": true,
    "securityFeatures": false,
    "manipulationDetection": true
  }
}
```

###### Internal Server Error (500)
```json
{
  "error": "Failed to process upload",
  "details": "Error message details"
}
```

#### Security Features

The upload endpoint implements several security measures:

1. **Image Validation**
   - Format verification (JPEG/PNG only)
   - Size limits (max 5MB)
   - Resolution requirements (min 640x480)
   - Quality checks (blur detection, lighting assessment)

2. **Document Authentication**
   - Hologram detection
   - Template matching
   - Security feature verification
   - Manipulation detection

3. **Data Protection**
   - Server-side encryption (AWS KMS)
   - PII data tagging
   - Sensitive data masking
   - Secure metadata handling

4. **Audit Logging**
   - Comprehensive event logging
   - Request tracking
   - Processing results
   - Error tracking

#### Rate Limiting

- 10 requests per minute per IP address
- 100 requests per hour per user

#### Error Codes

| Code | Description | HTTP Status | Details |
|------|-------------|-------------|---------|
| ERR_INVALID_FORMAT | Invalid image format | 400 | Supported formats: JPEG, PNG |
| ERR_LOW_QUALITY | Image quality below threshold | 400 | Includes quality metrics |
| ERR_NO_FACE | No face detected in selfie | 400 | - |
| ERR_MULTIPLE_FACES | Multiple faces detected | 400 | Number of faces found |
| ERR_NO_DOCUMENT | No valid document detected | 400 | - |
| ERR_LOW_CONFIDENCE | Low confidence in detection | 400 | Actual confidence score |
| ERR_PROCESSING | Processing error | 500 | Error details |

### Quality Requirements

- Minimum resolution: 640x480 pixels
- Face confidence threshold: 90%
- Document confidence threshold: 90%
- Blur threshold: 0.3
- Brightness range: 0.2 - 0.8

#### Notes

- All uploaded photos are processed for quality and authenticity
- ID documents undergo additional verification checks
- Extracted data is masked for security
- All operations are logged for audit purposes
- Files are stored with encryption at rest
