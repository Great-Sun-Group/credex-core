# Database Deployment Workflow

This document provides an overview of the database deployment workflow, which is defined in `.github/workflows/databases.yml`.

## Workflow Overview

The "Deploy Databases" workflow is designed to deploy Neo4j database instances using Terraform. It can be manually triggered and includes steps for managing Terraform state locks.

Key aspects of this workflow include:

1. **Trigger**: The workflow is manually triggered (`workflow_dispatch`) with one optional input parameter:

2. **Environment**: The workflow determines the environment (development, staging, or production) based on the Git branch.

3. **Steps**:
   - Checkout code
   - Set environment variables
   - Configure AWS credentials
   - Setup Terraform
   - Initialize Terraform
   - Apply Terraform changes
   - Print Neo4j information

## Detailed Process

### 1. Environment Setup
- Sets the environment based on the Git branch (production, staging, or development)

### 2. AWS Credential Configuration
- Configures AWS credentials using GitHub secrets

### 3. Terraform State Lock Management
- Checks for existing Terraform state locks

### 4. Terraform Setup and Initialization
- Sets up Terraform
- Initializes Terraform with the appropriate backend configuration

### 5. Terraform Apply
- Selects or creates the appropriate Terraform workspace
- Applies Terraform changes, targeting the Neo4j module
- Uses environment variables to control the creation of Neo4j instances and key pairs

### 6. Neo4j Information Output
- Prints important Neo4j information, including:
  - Bolt URLs for LedgerSpace and SearchSpace
  - Usernames and passwords
  - Private key for SSH access

## Important Notes

1. The workflow uses several GitHub secrets for sensitive information (e.g., AWS credentials, Neo4j Enterprise License).
2. The Terraform apply step is specifically targeted at the Neo4j module.
3. The workflow outputs sensitive information at the end, which should be securely stored and used for application configuration.

## Execution Caution

This workflow should be used with care as it deploys database infrastructure to a live environment, including production. Checks and backups are in place (**to be put in place**), but redeploying the database can wipe the current version. Ensure that:

1. You understand the implications of deploying or modifying database infrastructure.
2. The correct AWS credentials are configured.
3. The appropriate environment (branch) is selected.
4. All necessary secrets and environment variables are properly set in GitHub.

## Post-Deployment Actions

After the deployment is complete:

1. Securely store the output Neo4j information.
2. Update relevant GitHub secrets or application configurations with the new database information.
3. Verify the Neo4j instances are running correctly.
4. Perform any necessary post-deployment database setup or migrations.

## Conclusion

The database deployment workflow provides an automated way to deploy Neo4j instances using Terraform. It ensures that the database infrastructure is consistently set up across different environments while providing the necessary information for application configuration.
