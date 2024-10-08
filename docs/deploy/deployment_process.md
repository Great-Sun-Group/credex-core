# Deployment Process

This document outlines the deployment process for the credex-core application across development, staging, and production environments.

## Automated Deployment via GitHub Actions

The deployment process is automated using GitHub Actions workflows. Below is how to trigger deployments for each environment. All the deployment workflows can also be triggered manually in Github Actions.

1. For development: 
   - Push changes to the `dev` branch on the remote repository.
   - Manually trigger the development workflow using the `trigger-dev-deploy.ts` script:
     ```bash
     npx ts-node terraform/trigger-dev-deploy.ts
     ```

2. For staging: 
   - Push changes to the `stage` branch.

3. For production: 
   - Push changes to the `prod` branch.

The respective GitHub Actions workflow will automatically:
- Build the Docker image
- Push the image to ECR (Elastic Container Registry)
- Update the ECS task definition with environment-specific variables
- Deploy to the appropriate ECS cluster

## Environment-Specific Behavior

- **Development**: 
  - Deployments are triggered manually using the `trigger-dev-deploy.ts` script.
  - This allows for testing deployment changes before they affect staging or production.

- **Staging**: 
  - Deployments are triggered automatically by pushes to the `stage` branch.
  - This environment is used for testing changes in a production-like setting.

- **Production**: 
  - Deployments are triggered automatically by pushes to the `prod` branch.
  - Extra caution should be taken when deploying to production.

## Deployment Workflow

1. **Code Changes**:
   - Developers make changes in feature branches.
   - Changes are merged into `dev` for initial testing.

2. **Development Deployment**:
   - Changes in `dev` are deployed to the development environment using the `trigger-dev-deploy.ts` script.
   - This allows for testing of both application changes and deployment process changes.

3. **Staging Deployment**:
   - Once changes in `dev` are verified, they are merged into `stage`.
   - This automatically triggers a deployment to the staging environment.
   - Comprehensive automated testing is performed in the staging environment.

4. **Production Deployment**:
   - After successful testing in staging, changes are merged into `prod`.
   - This automatically triggers a deployment to the production environment.

## Post-Deployment Verification

After each deployment, it's crucial to verify that the application is functioning correctly:

1. Check the GitHub Actions logs for any deployment errors.
2. Verify that the ECS tasks are running correctly in the AWS console.
3. Access the application and perform basic functionality tests.
4. Monitor the application logs for any unexpected errors.

## Rollback Procedure

In case of issues after deployment in `stage` or `prod` branches:

1. Identify the last known good deployment (commit/tag).
2. Revert the changes in the respective branch.
3. Push the revert commit to trigger a new deployment with the previous working version.
4. Monitor the rollback deployment and verify that the issue is resolved.

By following this deployment process, you can ensure consistent and reliable deployments across all environments for the credex-core application.