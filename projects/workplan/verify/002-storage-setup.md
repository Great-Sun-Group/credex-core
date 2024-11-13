# Task: Storage Configuration Setup

## Overview
Configure the storage infrastructure for the ID verification system, including S3 bucket organization, lifecycle policies, and access patterns.

## Prerequisites
- Completed Task 001 (AWS Base Infrastructure)
- AWS CLI access
- Terraform workspace initialized

## Acceptance Criteria
1. S3 bucket folder structure implemented
2. Lifecycle policies configured for data retention
3. CORS policies implemented for API access
4. Access logging enabled and configured
5. Object versioning properly configured
6. Backup strategy implemented

## Implementation Steps

### 1. Create S3 Folder Structure
```terraform
# Define S3 folder structure
resource "aws_s3_object" "folders" {
  for_each = toset([
    "uploads/id-documents/",
    "uploads/selfies/",
    "processed/id-documents/",
    "processed/selfies/",
    "archived/",
    "temp/"
  ])
  
  bucket = var.photos_bucket_name
  key    = each.key
  source = "/dev/null"  # Empty object for folder creation
}

# Configure lifecycle rules
resource "aws_s3_bucket_lifecycle_configuration" "photos_lifecycle" {
  bucket = var.photos_bucket_name

  rule {
    id     = "archive-after-90-days"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }

  rule {
    id     = "clean-temp-folder"
    status = "Enabled"
    
    filter {
      prefix = "temp/"
    }

    expiration {
      days = 1
    }
  }
}
```

### 2. Configure CORS Policy
```terraform
resource "aws_s3_bucket_cors_configuration" "photos_cors" {
  bucket = var.photos_bucket_name

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = [var.api_domain]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
```

### 3. Enable Access Logging
```terraform
resource "aws_s3_bucket" "access_logs" {
  bucket = "${var.environment}-verification-access-logs"
}

resource "aws_s3_bucket_logging" "photos_logging" {
  bucket = var.photos_bucket_name

  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "s3-access-logs/"
}
```

### 4. Configure Backup Strategy
```terraform
resource "aws_s3_bucket_replication_configuration" "photos_replication" {
  bucket = var.photos_bucket_name
  role   = aws_iam_role.replication.arn

  rule {
    id     = "backup-critical-data"
    status = "Enabled"

    filter {
      prefix = "processed/"
    }

    destination {
      bucket = aws_s3_bucket.backup.arn
      storage_class = "STANDARD_IA"
    }
  }
}
```

## Testing Requirements
1. Verify Folder Structure
   ```bash
   aws s3 ls s3://${BUCKET_NAME}/ --recursive
   ```

2. Test Lifecycle Rules
   ```bash
   aws s3api get-bucket-lifecycle-configuration --bucket ${BUCKET_NAME}
   ```

3. Verify CORS Configuration
   ```bash
   aws s3api get-bucket-cors --bucket ${BUCKET_NAME}
   ```

4. Test Access Logging
   ```bash
   aws s3api get-bucket-logging --bucket ${BUCKET_NAME}
   ```

## Documentation Requirements
1. Update storage documentation with:
   - Folder structure diagram
   - Lifecycle policy details
   - Access patterns
   - Backup strategy

2. Document in code:
   - Resource configurations
   - Policy explanations
   - Security measures

## Merge Request Checklist
- [ ] Terraform code formatted
- [ ] All configurations tested
- [ ] Documentation updated
- [ ] Security review completed
- [ ] Backup strategy validated
- [ ] Access patterns tested
- [ ] Branch up to date with verify-project

## Notes
- Ensure all paths follow naming conventions
- Verify retention periods match requirements
- Test access patterns thoroughly
- Document any manual verification steps

## Estimated Time
3-4 hours

## Dependencies
- Task 001 (AWS Base Infrastructure)

## Next Steps
After this task is completed, proceed with:
1. Photo Upload API (003-photo-upload-api)
2. Configure monitoring and alerts
