# Task: AWS Base Infrastructure Setup

## Overview
Set up the foundational AWS infrastructure using Terraform for the ID verification system, including Rekognition collection, IAM roles, and initial S3 bucket configuration.

## Prerequisites
- AWS account with administrative access
- Terraform installed locally
- AWS CLI configured
- Access to project repository

## Acceptance Criteria
1. Rekognition collection is created and accessible
2. IAM roles and policies are properly configured with least privilege
3. S3 bucket is created with appropriate security settings
4. All resources are tagged according to project standards
5. Terraform state is properly managed and stored
6. Infrastructure can be deployed and destroyed cleanly

## Implementation Steps

### 1. Create Terraform Configuration
```terraform
# Rekognition collection
resource "aws_rekognition_collection" "member_faces" {
  collection_id = "${var.environment}-member-faces"
}

# IAM role for Rekognition
resource "aws_iam_role" "rekognition_role" {
  name = "${var.environment}-rekognition-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rekognition.amazonaws.com"
        }
      }
    ]
  })
}

# S3 bucket for storing photos
resource "aws_s3_bucket" "verification_photos" {
  bucket = "${var.environment}-member-verification-photos"
  
  versioning {
    enabled = true
  }
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

# S3 bucket policy
resource "aws_s3_bucket_policy" "verification_photos" {
  bucket = aws_s3_bucket.verification_photos.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "EnforceHTTPS"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = [
          "${aws_s3_bucket.verification_photos.arn}/*",
          aws_s3_bucket.verification_photos.arn
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport": "false"
          }
        }
      }
    ]
  })
}
```

### 2. Create Variables File
```terraform
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}
```

### 3. Create Outputs File
```terraform
output "rekognition_collection_id" {
  value = aws_rekognition_collection.member_faces.id
}

output "photos_bucket_name" {
  value = aws_s3_bucket.verification_photos.id
}

output "rekognition_role_arn" {
  value = aws_iam_role.rekognition_role.arn
}
```

## Testing Requirements
1. Verify Rekognition Collection
   ```bash
   aws rekognition describe-collection --collection-id "${ENVIRONMENT}-member-faces"
   ```

2. Verify S3 Bucket
   ```bash
   aws s3api head-bucket --bucket "${ENVIRONMENT}-member-verification-photos"
   ```

3. Verify IAM Role
   ```bash
   aws iam get-role --role-name "${ENVIRONMENT}-rekognition-role"
   ```

## Documentation Requirements
1. Update project documentation with:
   - Resource naming conventions
   - AWS resource list
   - Access patterns
   - Security configurations

2. Document in code:
   - Clear comments for each resource
   - Variable descriptions
   - Output descriptions

## Merge Request Checklist
- [ ] Terraform code formatted (`terraform fmt`)
- [ ] Terraform validated (`terraform validate`)
- [ ] Resources tested in development environment
- [ ] Documentation updated
- [ ] Security review completed
- [ ] Cost estimation provided
- [ ] Cleanup/destroy tested
- [ ] Branch up to date with verify-project

## Notes
- Ensure all resource names follow project naming conventions
- Use consistent tagging for cost tracking
- Consider implementing additional security measures as needed
- Document any manual steps required after deployment

## Estimated Time
4-6 hours

## Dependencies
None - This is a foundational task

## Next Steps
After this task is completed, proceed with:
1. Storage Configuration (002-storage-setup)
2. API Development tasks
