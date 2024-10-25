# Application Deployment Workflow

This document provides an overview of the application deployment workflow, which is defined in `.github/workflows/app.yml`.

## Workflow Overview

The "Deploy Application" workflow is designed to build, push, and deploy the application to AWS ECS (Elastic Container Service). It can be manually triggered and includes steps for managing Terraform state and infrastructure.

Key aspects of this workflow include:

1. **Trigger**: The workflow is manually triggered (`workflow_dispatch`).

2. **Environment**: The workflow determines the environment (development, staging, or production) based on the Git branch.

3. **AWS Region**: The workflow is configured to use the af-south-1 (Cape Town) region.

4. **Steps**:
   - Checkout code
   - Set environment variables
   - Configure AWS credentials
   - Setup and initialize Terraform
   - Login to Amazon ECR
   - Build, tag, and push Docker image to ECR
   - Plan and apply Terraform changes
   - Deploy the application to ECS
   - Print deployment information

## Detailed Process

### 1. Environment Setup
- Sets the environment based on the Git branch (production, staging, or development)
- Initializes Terraform with environment-specific backend configuration

### 2. AWS Credential Configuration
- Configures AWS credentials using GitHub secrets

### 3. Terraform Setup and Initialization
- Sets up Terraform
- Initializes Terraform with the appropriate backend configuration, using environment-specific S3 buckets and DynamoDB tables for state management

### 4. Docker Image Build and Push
- Logs in to Amazon ECR
- Builds the Docker image with environment-specific build arguments, including sensitive information from GitHub secrets
- Tags the image with the Git SHA
- Pushes the image to ECR

### 5. Terraform Plan and Apply
- Plans Terraform changes, targeting the app module
- Applies Terraform changes, targeting the app module

### 6. Application Deployment
- Fetches the current ECS task definition
- Updates the task definition with the new image and environment variables
- Registers the new task definition
- Updates the ECS service with the new task definition
- Waits for the service to stabilize

### 7. Deployment Information
- Prints information about the completed deployment
- Outputs Terraform information for the app module

## Important Notes

1. The workflow uses several GitHub secrets for sensitive information (e.g., AWS credentials, database credentials, API keys).
2. The Docker build process includes multiple environment variables as build arguments, which are passed securely using GitHub secrets.
3. The deployment process updates the ECS task definition and service, ensuring a smooth rollout of the new version.
4. The workflow includes error handling and waiting mechanisms to ensure the deployment is successful.
5. Terraform is used to manage the application infrastructure, with specific targeting of the app module.

## Execution Caution

This workflow should be used with care as it deploys the application to a live environment, including production. Ensure that:

1. The correct AWS credentials are configured.
2. The appropriate environment (branch) is selected.
3. All necessary secrets and environment variables are properly set in GitHub.
4. The code being deployed has been thoroughly tested.
5. You understand the implications of the Terraform changes being applied.

## Post-Deployment Actions

After the deployment is complete:

1. Review the Terraform outputs for any important information or changes.
2. Verify the ECS service status and running tasks.
3. Monitor application logs for any issues.
4. Perform any necessary post-deployment tests or verifications.

## Conclusion

The application deployment workflow provides an automated and controlled way to deploy the application to AWS ECS. It ensures that the latest code is built, containerized, and deployed with the appropriate configuration for each environment. The use of Terraform for infrastructure management adds an extra layer of consistency and control to the deployment process.
