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
   - Sets the `use_existing_resources` map based on the presence of existing resources.

3. **Terraform Workspace Management**:
   - Uses the `manage_workspaces.sh` script to create and select the appropriate Terraform workspace for the target environment.

4. **Import Existing Resources**:
   - If existing resources are detected, runs the `import_existing_resources.sh` script to import them into the Terraform state.

5. **Terraform Plan and Apply**:
   - Runs `terraform plan` to preview changes.
   - If changes are detected, runs `terraform apply` to apply the changes.

6. **Application Deployment**:
   - Deploys the application using the information from Terraform outputs.

7. **Post-Deployment Tests**:
   - Runs post-deployment tests to verify the application's functionality.

8. **Cleanup Process** (Optional):
   - If enabled, runs the `cleanup_orphaned_resources.sh` script to identify and remove orphaned resources.

9. **Deployment Logging**:
   - Logs the deployment details for future reference.

## Handling Existing Resources

The deployment process now uses a map structure for `use_existing_resources`, allowing granular control over which resources to create or use existing ones:

- The `pre_deployment_check.sh` script detects existing resources and sets the `use_existing_resources` map accordingly.
- Each resource in the Terraform configuration checks its corresponding key in the `use_existing_resources` map to determine whether to create a new resource or use an existing one.
- This approach provides flexibility in managing infrastructure across different environments and deployment scenarios.

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

## Best Practices

1. Always review Terraform plans before applying changes, especially in production.
2. Use meaningful commit messages and tags to easily identify deployment versions.
3. Regularly update and test the post-deployment verification process.
4. Keep the `cleanup_orphaned_resources.sh` script updated as new resource types are added to the infrastructure.
5. Periodically review and update the Terraform configurations to leverage new features and best practices.
6. Maintain a comprehensive test suite for the application and infrastructure to catch issues early.

By following this unified deployment process, you can ensure consistent and reliable deployments across all environments for the credex-core application, with improved handling of existing resources and better management of the infrastructure state.