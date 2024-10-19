# Maintenance and Updates

This document outlines the processes for maintaining the credex-core application and its infrastructure, as well as how to handle updates across different environments.

## Updating the Application

We use a modular deployment process for all environments (development, staging, and production) managed through three separate GitHub Actions workflows: connectors, databases, and app.

### Development Environment

1. Push changes to the `dev` branch on the remote repository.
2. Manually trigger the appropriate deployment workflow(s) through the GitHub Actions interface:
   - Select the "Deploy Connectors", "Deploy Databases", or "Deploy App" workflow as needed.
   - Choose "development" as the deployment environment.
   - Set other options as needed (e.g., use existing resources, run cleanup).
3. Review the deployment logs and verify the changes in the development environment.

### Staging Environment

1. After testing in the development environment, merge changes from `dev` to `stage` branch.
2. This will automatically trigger the staging deployment for the affected components.
3. Monitor the deployment process in the GitHub Actions interface.
4. Run appropriate tests in the staging environment to ensure everything is working as expected.

### Production Environment

1. Once changes have been thoroughly tested in staging, merge from `stage` to `prod` branch.
2. This will automatically trigger the production deployment for the affected components.
3. Monitor the deployment closely in the GitHub Actions interface.
4. Perform post-deployment checks to ensure the application is functioning correctly in production.

## Managing Terraform Workspaces

1. Each workflow (connectors, databases, app) uses its own Terraform workspace for each environment.

2. Workspaces are automatically managed as part of the deployment process.

3. If you need to manage workspaces manually (e.g., when working with Terraform locally), use the following commands:
   ```bash
   terraform workspace select <component>_<environment>
   ```
   Replace `<component>` with `connectors`, `databases`, or `app`, and `<environment>` with `development`, `staging`, or `production`.

4. Ensure you're in the correct workspace before running any Terraform commands manually.

## Handling Existing Resources

1. For automatic deployments (pushes to `stage` or `prod` branches), the `use_existing_resources` flag is set to `true` by default for each workflow.

2. For manual deployments, you can choose whether to use existing resources when triggering the workflow through the GitHub Actions interface.

3. Each workflow will automatically identify and import existing resources into the Terraform state.

4. After importing, you can manage these resources using Terraform as usual.

## Cleanup Process for Orphaned Resources

1. For automatic deployments, the cleanup process is not run by default to ensure safety.

2. For manual deployments, you can choose to run the cleanup process when triggering the workflow through the GitHub Actions interface.

3. If enabled, the cleanup process will run after a successful deployment to identify and remove orphaned resources.

4. Use this feature cautiously, especially in production environments.

## Updating ECS Task Definition

1. Modify the `task-definition.json` in the `terraform/modules/app` directory if needed.
2. Add any new environment variables to the `environment` section.
3. Update the GitHub Actions workflow to replace placeholders with corresponding GitHub Secrets.
4. Commit these changes and follow the normal deployment process for the target environment.

## Updating Neo4j Instances

### Updating Neo4j Versions

1. The AMI management process will automatically check for new versions and create new AMIs as needed.
2. To apply these updates:
   - Run `terraform plan` in the databases workspace to see the proposed changes.
   - If changes are detected, run `terraform apply` to update the instances with the new AMI.

### Updating Neo4j Configurations

1. Modify the `user_data` scripts in the `terraform/modules/databases/main.tf` file.
2. Run `terraform plan` in the databases workspace to review the changes.
3. Run `terraform apply` to apply the changes.

**Note:** Be cautious when updating Neo4j instances, especially in production. Ensure you have recent backups before proceeding.

## Dependency Management

1. Regularly review and update dependencies in `package.json`.
2. Consider using tools like Dependabot to automate dependency updates.
3. Always test thoroughly after updating dependencies, especially major version changes.

## Infrastructure Maintenance

1. Regularly review and optimize AWS resources:
   - Check for unused or underutilized resources in each module (connectors, databases, app).
   - Consider rightsizing EC2 instances based on actual usage.

2. Keep Terraform modules and providers up to date:
   - Periodically check for updates to Terraform itself and any providers used.
   - Test updates in lower environments before applying to production.

3. Rotate IAM access keys regularly:
   - Update the rotated keys in GitHub Secrets and other relevant places.

4. Regularly run the pre-deployment checks for each module to ensure consistency.

## Database Maintenance

[This section remains unchanged]

## Logging and Monitoring Maintenance

[This section remains unchanged]

## Security Maintenance

[This section remains unchanged]

## Documentation Maintenance

1. Keep all deployment and operation documentation up to date, reflecting the modular structure.
2. Document any significant changes to the deployment process or infrastructure for each module.
3. Maintain a changelog to track major updates and changes across all modules.

## Module-Specific Maintenance

### Connectors Module

1. Regularly review and optimize network configurations.
2. Ensure security groups are properly configured and up to date.
3. Monitor and optimize costs related to networking resources.

### Databases Module

1. Regularly review and optimize database configurations.
2. Monitor database performance and scale resources as needed.
3. Ensure backup and recovery processes are working correctly.

### App Module

1. Regularly review and optimize ECS configurations.
2. Monitor application performance and scale resources as needed.
3. Ensure the latest application code is deployed and running correctly.

By following these maintenance and update procedures, you can ensure that the credex-core application and its infrastructure remain up-to-date, secure, and performant across all environments and modules.
