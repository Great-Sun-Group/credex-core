# Application Deployment Workflow

This document provides an overview of the application deployment workflow, which is defined in `.github/workflows/app.yml`.

## Workflow Overview

The "Deploy Application" workflow is designed to build, push, and deploy the application to AWS ECS (Elastic Container Service). It can be manually triggered and includes steps for managing Terraform state locks.

Key aspects of this workflow include:

1. **Trigger**: The workflow is manually triggered (`workflow_dispatch`) with one optional input parameter:

2. **Environment**: The workflow determines the environment (development, staging, or production) based on the Git branch.

3. **Steps**:
   - Checkout code
   - Set environment variables
   - Configure AWS credentials
   - Login to Amazon ECR
   - Build, tag, and push Docker image to ECR
   - Deploy the application to ECS
   - Print deployment information

## Detailed Process

### 1. Environment Setup
- Sets the environment based on the Git branch (production, staging, or development)
- Sets the Terraform state bucket and lock table names

### 2. AWS Credential Configuration
- Configures AWS credentials using GitHub secrets

### 4. Docker Image Build and Push
- Logs in to Amazon ECR
- Builds the Docker image with environment-specific build arguments
- Tags and pushes the image to ECR

### 5. Application Deployment
- Fetches the current ECS task definition
- Updates the task definition with the new image and environment variables
- Registers the new task definition
- Updates the ECS service with the new task definition
- Waits for the service to stabilize

### 6. Deployment Information
- Prints information about the completed deployment

## Important Notes

1. The workflow uses several GitHub secrets for sensitive information (e.g., AWS credentials, database credentials, API keys).
2. The Docker build process includes multiple environment variables as build arguments.
3. The deployment process updates the ECS task definition and service, ensuring a smooth rollout of the new version.
4. The workflow includes error handling and waiting mechanisms to ensure the deployment is successful.

## Execution Caution

This workflow should be used with care as it deploys the application to a live environment, including production. Ensure that:

1. The correct AWS credentials are configured.
2. The appropriate environment (branch) is selected.
3. All necessary secrets and environment variables are properly set in GitHub.
4. The code being deployed has been thoroughly tested.

## Post-Deployment Actions

After the deployment is complete:

1. Verify the ECS service status and running tasks.
2. Monitor application logs for any issues.
3. Perform any necessary post-deployment tests or verifications.

## Conclusion

The application deployment workflow provides an automated and controlled way to deploy the application to AWS ECS. It ensures that the latest code is built, containerized, and deployed with the appropriate configuration for each environment.
