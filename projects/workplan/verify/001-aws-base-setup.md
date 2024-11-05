# Task: AWS Base Infrastructure Setup

## Overview
Set up the foundational AWS infrastructure using Terraform for the ID verification system, including IAM roles and initial S3 bucket configuration. The Rekognition collection will be created via AWS SDK in the application code.

## Prerequisites
- AWS account with administrative access
- Terraform installed locally
- AWS CLI configured
- Access to project repository

## Important Note
The Rekognition collection must be created via AWS SDK/API in the application code, as Terraform does not support managing Rekognition collections directly. The infrastructure setup provides all necessary IAM roles and permissions for the application to create and manage the collection.

Collection creation code example:
```javascript
const AWS = require('aws-sdk');
const rekognition = new AWS.Rekognition();

async function createCollection() {
  const params = {
    CollectionId: `credex-member-faces-${process.env.ENVIRONMENT}`
  };
  
  try {
    const result = await rekognition.createCollection(params).promise();
    console.log('Collection created:', result);
  } catch (err) {
    if (err.code === 'ResourceAlreadyExistsException') {
      console.log('Collection already exists');
    } else {
      throw err;
    }
  }
}
```

## Implementation Status

### 1. Infrastructure Changes
- Added S3 bucket for verification photos with:
  - Versioning enabled
  - Server-side encryption (AES-256)
  - Public access blocked
  - Proper tagging

- Created IAM roles and policies:
  - Rekognition service role
  - ECS task role permissions for Rekognition
  - S3 access permissions for verification photos

### 2. AWS Permissions
- Updated credex-core-permissions.html with:
  - Rekognition API permissions
  - Service-linked role for Rekognition

### 3. Documentation
- Added SDK requirement note
- Provided collection creation code example
- Updated implementation details

## Next Steps
1. Implement collection creation in application code
2. Proceed with Storage Configuration (002-storage-setup)

## Testing Requirements
1. Verify S3 Bucket
   ```bash
   aws s3api head-bucket --bucket "${ENVIRONMENT}-member-verification-photos"
   ```

2. Verify IAM Role
   ```bash
   aws iam get-role --role-name "${ENVIRONMENT}-rekognition-role"
   ```

3. Test Collection Creation (via SDK)
   ```javascript
   // Use the code example from Important Note section
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
- [x] Terraform code formatted (`terraform fmt`)
- [x] Terraform validated (`terraform validate`)
- [x] Resources tested in development environment
- [ ] Documentation updated
- [ ] Security review completed
- [x] Cleanup/destroy tested (not required)
- [ ] Branch up to date with verify-project

## Notes
- Rekognition collection must be created via SDK
- All resource names follow project naming conventions
- Using consistent tagging for cost tracking
- Security measures implemented as per requirements

## Dependencies
None - This is a foundational task

## Next Steps
After this task is completed, proceed with:
1. Storage Configuration (002-storage-setup)
2. API Development tasks
