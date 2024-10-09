# Maintenance and Updates

This document outlines the processes for maintaining the credex-core application and its infrastructure, as well as how to handle updates across different environments.

## Updating the Application

We use a unified deployment process for all environments (development, staging, and production) managed through a single GitHub Actions workflow.

### Development Environment

1. Push changes to the `dev` branch on the remote repository.
2. Manually trigger the deployment workflow through the GitHub Actions interface:
   - Select the "Deploy to AWS" workflow.
   - Choose "development" as the deployment environment.
   - Set other options as needed (e.g., use existing resources, run cleanup).
3. Review the deployment logs and verify the changes in the development environment.

### Staging Environment

1. After testing in the development environment, merge changes from `dev` to `stage` branch.
2. This will automatically trigger the staging deployment.
3. Monitor the deployment process in the GitHub Actions interface.
4. Run appropriate tests in the staging environment to ensure everything is working as expected.

### Production Environment

1. Once changes have been thoroughly tested in staging, merge from `stage` to `prod` branch.
2. This will automatically trigger the production deployment.
3. Monitor the deployment closely in the GitHub Actions interface.
4. Perform post-deployment checks to ensure the application is functioning correctly in production.

## Managing Terraform Workspaces

1. The `manage_workspaces.sh` script is automatically run as part of the deployment process to select the appropriate Terraform workspace for each environment.

2. If you need to manage workspaces manually (e.g., when working with Terraform locally), use the script as follows:
   ```bash
   ./terraform/manage_workspaces.sh <environment>
   ```
   Replace `<environment>` with `development`, `staging`, or `production`.

3. Ensure you're in the correct workspace before running any Terraform commands manually.

## Handling Existing Resources

1. For automatic deployments (pushes to `stage` or `prod` branches), the `use_existing_resources` flag is set to `true` by default.

2. For manual deployments, you can choose whether to use existing resources when triggering the workflow through the GitHub Actions interface.

3. The `pre_deployment_check.sh` script will run automatically to identify existing resources.

4. If existing resources are found, the `import_state.sh` script will import them into the Terraform state.

5. After importing, you can manage these resources using Terraform as usual.

## Cleanup Process for Orphaned Resources

1. For automatic deployments, the cleanup process is not run by default to ensure safety.

2. For manual deployments, you can choose to run the cleanup process when triggering the workflow through the GitHub Actions interface.

3. If enabled, the cleanup process will run after a successful deployment to identify and remove orphaned resources.

4. Use this feature cautiously, especially in production environments.

## Updating ECS Task Definition

1. Modify the `task-definition.json` in the `terraform` directory if needed.
2. Add any new environment variables to the `environment` section.
3. Update the GitHub Actions workflow to replace placeholders with corresponding GitHub Secrets.
4. Commit these changes and follow the normal deployment process for the target environment.

## Updating Neo4j Instances

### Updating Neo4j Versions

1. The AMI management process will automatically check for new versions and create new AMIs as needed.
2. To apply these updates:
   - Run `terraform plan` to see the proposed changes.
   - If changes are detected, run `terraform apply` to update the instances with the new AMI.

### Updating Neo4j Configurations

1. Modify the `user_data` scripts in the `terraform/main.tf` file.
2. Run `terraform plan` to review the changes.
3. Run `terraform apply` to apply the changes.

**Note:** Be cautious when updating Neo4j instances, especially in production. Ensure you have recent backups before proceeding.

## Dependency Management

1. Regularly review and update dependencies in `package.json`.
2. Consider using tools like Dependabot to automate dependency updates.
3. Always test thoroughly after updating dependencies, especially major version changes.

## Infrastructure Maintenance

1. Regularly review and optimize AWS resources:
   - Check for unused or underutilized resources.
   - Consider rightsizing EC2 instances based on actual usage.

2. Keep Terraform modules and providers up to date:
   - Periodically check for updates to Terraform itself and any providers used.
   - Test updates in lower environments before applying to production.

3. Rotate IAM access keys regularly:
   - Update the rotated keys in GitHub Secrets and other relevant places.

4. Regularly run the pre-deployment checks to ensure consistency:
   ```bash
   ./terraform/pre_deployment_check.sh
   ```

## Database Maintenance

1. Regularly backup Neo4j databases:
   - Set up automated backups using AWS Backup or custom scripts.
   - Test restore procedures periodically to ensure backups are valid.

2. Monitor database performance:
   - Set up CloudWatch alarms for key database metrics.
   - Regularly review query performance and optimize as needed.

3. Perform regular database maintenance tasks:
   - Follow Neo4j best practices for maintenance operations.
   - Schedule maintenance windows for operations that may impact performance.

## Logging and Monitoring Maintenance

1. Regularly review and optimize CloudWatch log retention policies.
2. Ensure CloudWatch alarms are still relevant and adjust thresholds if needed.
3. Periodically review and analyze logs for patterns or issues that may require attention.

## Security Maintenance

1. Regularly apply security patches to all systems.
2. Conduct periodic security audits and penetration tests.
3. Review and update IAM policies and security group rules regularly.

## Documentation Maintenance

1. Keep all deployment and operation documentation up to date.
2. Document any significant changes to the deployment process or infrastructure.
3. Maintain a changelog to track major updates and changes.

By following these maintenance and update procedures, you can ensure that the credex-core application and its infrastructure remain up-to-date, secure, and performant across all environments.