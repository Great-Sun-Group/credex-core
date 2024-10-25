# Database Deployment Workflow

This document provides an overview of the database deployment workflow, which is defined in `.github/workflows/databases.yml`.

## Workflow Overview

The "Deploy Databases" workflow is designed to deploy Neo4j database instances using Terraform. It can be manually triggered and includes steps for managing Terraform state.

Key aspects of this workflow include:

1. **Trigger**: The workflow is manually triggered (`workflow_dispatch`).

2. **Environment**: The workflow determines the environment (development, staging, or production) based on the Git branch.

3. **AWS Region**: The workflow is configured to use the af-south-1 (Cape Town) region.

4. **Steps**:
   - Checkout code
   - Set environment variables
   - Configure AWS credentials
   - Setup Terraform
   - Initialize Terraform
   - Plan Terraform changes
   - Apply Terraform changes
   - Print Neo4j information

## Detailed Process

### 1. Environment Setup
- Sets the environment based on the Git branch (production, staging, or development)

### 2. AWS Credential Configuration
- Configures AWS credentials using GitHub secrets

### 3. Terraform Setup and Initialization
- Sets up Terraform
- Initializes Terraform with the appropriate backend configuration, using environment-specific S3 buckets and DynamoDB tables for state management

### 4. Terraform Plan and Apply
- Selects or creates the appropriate Terraform workspace based on the environment
- Plans Terraform changes, targeting the databases module
- Applies Terraform changes, targeting the databases module
- Uses environment variables to control the creation of Neo4j instances, including the Neo4j Enterprise License

### 5. Database Information Output
- Prints important database infrastructure information using `terraform output`, including:
  - All outputs from the databases module, formatted as key-value pairs

## Important Notes

1. The workflow uses several GitHub secrets for sensitive information (e.g., AWS credentials, Neo4j Enterprise License).
2. The Terraform plan and apply steps are specifically targeted at the databases module.
3. The workflow uses Terraform workspaces to manage different environments (development, staging, production).
4. The Neo4j Enterprise License is passed as a Terraform variable using a GitHub secret.
5. The workflow outputs database information at the end, which should be securely stored and used for application configuration.

## Execution Caution

This workflow should be used with care as it deploys database infrastructure to a live environment, including production. Ensure that:

1. You understand the implications of deploying or modifying database infrastructure.
2. The correct AWS credentials are configured.
3. The appropriate environment (branch) is selected.
4. All necessary secrets and environment variables are properly set in GitHub.
5. The Neo4j Enterprise License is valid and correctly set as a GitHub secret.

## Post-Deployment Actions

After the deployment is complete:

1. Securely store the output database information as secrets in the appropriate Github Environment (development, staging, production).
2. Update relevant GitHub secrets or application configurations with the new database information.
3. Verify the Neo4j instances are running correctly.
4. Perform any necessary post-deployment database setup or migrations.

## Conclusion

The database deployment workflow provides an automated way to deploy Neo4j instances using Terraform. It ensures that the database infrastructure is consistently set up across different environments while providing the necessary information for application configuration. The use of Terraform workspaces and environment-specific state management allows for isolated and manageable deployments across different environments.
