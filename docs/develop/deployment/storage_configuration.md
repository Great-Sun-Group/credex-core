# Storage Configuration Documentation

## Folder Structure

```
credex-verification-photos-{environment}/
├── uploads/
│   ├── id-documents/     # Raw ID document uploads
│   └── selfies/         # Raw selfie photo uploads
├── processed/
│   ├── id-documents/     # Processed and validated ID documents
│   └── selfies/         # Processed and validated selfies
├── archived/            # Long-term storage for historical records
└── temp/               # Temporary storage for processing

credex-verification-logs-{environment}/
└── access-logs/        # S3 access logs for audit trail

credex-verification-backups-{environment}/
└── processed/          # Cross-region backup of processed files
```

## Lifecycle Policies

### Upload Files
- Storage Class: STANDARD → GLACIER
- Transition: After 90 days
- Expiration: After 365 days
- Applies to: All files in uploads/

### Processed Files
- Storage Class: STANDARD → STANDARD_IA → GLACIER
- First Transition: After 30 days to STANDARD_IA
- Second Transition: After 90 days to GLACIER
- Applies to: All files in processed/

### Temporary Files
- Storage Class: STANDARD
- Expiration: After 1 day
- Applies to: All files in temp/

## Access Patterns

### Write Operations
1. Upload Path:
   ```
   uploads/{type}/{timestamp}-{uuid}.{ext}
   ```
   - type: 'id-documents' or 'selfies'
   - timestamp: ISO format
   - uuid: Unique identifier
   - ext: File extension (jpg/png)

2. Process Path:
   ```
   processed/{type}/{timestamp}-{uuid}.{ext}
   ```
   - Files moved here after successful validation

### Read Operations
1. Verification Process:
   - Read from uploads/ for initial processing
   - Read from processed/ for verification
   - Temporary files in temp/ for processing

2. Audit & Compliance:
   - Access logs available in verification-logs bucket
   - Historical data retrievable from archived/

## Backup Strategy

### Cross-Region Replication
- Primary Region: af-south-1
- Backup Region: us-east-1
- Replication Rules:
  - Processed files only
  - Storage class: STANDARD_IA in backup region
  - Versioning enabled

### Retention
- Primary bucket: Full versioning enabled
- Backup bucket: Versioning enabled
- Access logs: 90 days retention

## Security Measures

### Encryption
- Server-side encryption (AES-256)
- Encryption in transit required
- Backup bucket encrypted

### Access Control
- Public access blocked
- CORS restricted to application domain
- IAM roles with least privilege
- Access logging enabled

### IAM Policies
1. ECS Task Role:
   - Read/Write to verification photos bucket
   - Read-only to processed files
   - No access to backup bucket

2. Rekognition Role:
   - Read-only access to verification photos
   - Collection management permissions
   - No write access to buckets

## Monitoring & Alerts

### CloudWatch Metrics
- Storage usage by prefix
- Access patterns
- Lifecycle transitions
- Replication health

### Cost Optimization
- Lifecycle policies reduce storage costs
- Infrequent access for processed files
- Glacier for long-term storage
- Temporary file cleanup

## Testing Procedures

### Storage Operations
```bash
# Upload test
aws s3 cp test-image.jpg s3://credex-verification-photos-${ENV}/uploads/id-documents/

# Read test
aws s3 cp s3://credex-verification-photos-${ENV}/processed/id-documents/test-image.jpg .

# List objects
aws s3 ls s3://credex-verification-photos-${ENV}/uploads/id-documents/

# Check encryption
aws s3api head-object --bucket credex-verification-photos-${ENV} --key uploads/id-documents/test-image.jpg
```

### Lifecycle Testing
```bash
# Check lifecycle rules
aws s3api get-bucket-lifecycle-configuration --bucket credex-verification-photos-${ENV}

# Verify transitions
aws s3api head-object --bucket credex-verification-photos-${ENV} --key processed/id-documents/test-image.jpg
```

### Replication Testing
```bash
# Check replication status
aws s3api head-object --bucket credex-verification-backups-${ENV} --key processed/id-documents/test-image.jpg

# Verify backup bucket
aws s3api get-bucket-versioning --bucket credex-verification-backups-${ENV}
