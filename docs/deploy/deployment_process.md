# Deployment Process

This document outlines the deployment process for the credex-core application across development, staging, and production environments.

## Automated Deployment via GitHub Actions

The deployment process is automated using a unified GitHub Actions workflow defined in `.github/workflows/deploy.yml`. This workflow handles deployments for all environments (development, staging, and production). Deployments can be triggered in two ways:

1. **Automatic Deployments**:
   - For staging: Automatically triggered by pushes to the `stage` branch.
   - For production: Automatically triggered by pushes to the `prod` branch.

2. **Manual Deployments**:
   - Can be triggered manually for any environment (development, staging, or production) using the GitHub Actions interface.
   - Allows specifying additional parameters such as whether to use existing resources and whether to run the cleanup process.

## Environment-Specific Behavior

- **Development**: 
  - Deployed manually through the GitHub Actions interface.
  - Used for testing deployment changes before they affect the more stable staging or production deployments.

- **Staging**: 
  - Automatically deployed when changes are pushed to the `stage` branch.
  - Can also be manually deployed through the GitHub Actions interface.
  - Used for testing changes in a production-like setting.

- **Production**: 
  - Automatically deployed when changes are pushed to the `prod` branch.
  - Can also be manually deployed through the GitHub Actions interface.
  - Extra caution should be taken when deploying to production.

## Deployment Workflow

1. **Code Changes**:
   - Developers make changes in feature branches.
   - Changes are merged into `dev` for initial testing.

2. **Development Deployment**:
   - Changes in `dev` are deployed to the development environment with the manual trigger in Github Actions.
   - This allows for testing of both application changes and deployment process changes.

3. **Staging Deployment**:
   - Once changes in `dev` are verified, they are merged into `stage`.
   - This automatically triggers a deployment to the staging environment.
   - Comprehensive automated testing is performed in the staging environment.

4. **Production Deployment**:
   - After successful testing in staging, changes are merged into `prod`.
   - This automatically triggers a deployment to the production environment.

## Unified Deployment Process

The unified `deploy.yml` workflow performs the following steps for all environments:

1. **Environment Detection**:
   - Automatically detects the target environment based on the trigger (branch push or manual input).

2. **Pre-deployment Checks**: 
   - Runs the `pre_deployment_check.sh` script to check for existing resources and prepare for deployment.

3. **Terraform Workspace Management**:
   - Uses the `manage_workspaces.sh` script to create and select the appropriate Terraform workspace for the target environment.

4. **Terraform Plan and Apply**:
   - Runs `terraform plan` to preview changes.
   - If changes are detected, runs `terraform apply` to apply the changes.

5. **Application Deployment**:
   - Deploys the application using the information from Terraform outputs.

6. **Post-Deployment Tests**:
   - Runs post-deployment tests to verify the application's functionality.

7. **Cleanup Process** (Optional):
   - If enabled, runs the `cleanup_orphaned_resources.sh` script to identify and remove orphaned resources.

8. **Deployment Logging**:
   - Logs the deployment details for future reference.

## Handling Existing Resources

When deploying to an environment with existing resources:

1. For automatic deployments (pushes to `stage` or `prod`), the `use_existing_resources` flag is set to `true` by default.
2. For manual deployments, you can choose whether to use existing resources when triggering the workflow.
3. The pre-deployment checks will identify existing resources.
4. The state import script will import these resources into the Terraform state if necessary.
5. Terraform will then manage these existing resources, making only necessary changes.

## Post-Deployment Verification

After each deployment, it's crucial to verify that the application is functioning correctly:

1. Check the GitHub Actions logs for any deployment errors.
2. Verify that the ECS tasks are running correctly in the AWS console.
3. Access the application and perform basic functionality tests.
4. Monitor the application logs for any unexpected errors.
5. Review the Terraform output for any unexpected changes or warnings.

## Rollback Procedure

In case of issues after deployment:

1. Identify the last known good deployment (commit/tag).
2. Revert the changes in the respective branch (`stage` or `prod`).
3. Push the revert commit to automatically trigger a new deployment with the previous working version.
4. Monitor the rollback deployment and verify that the issue is resolved.
5. If necessary, use the Terraform workspace management and state import scripts to ensure the infrastructure aligns with the rolled-back version.

By following this unified deployment process, you can ensure consistent and reliable deployments across all environments for the credex-core application, with improved handling of existing resources and better management of the infrastructure state.