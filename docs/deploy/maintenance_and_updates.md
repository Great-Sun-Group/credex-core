# Maintenance and Updates

This document outlines the processes for maintaining the credex-core application and its infrastructure, as well as how to handle updates across different environments.

## Updating the Application

### Development Environment

1. Push changes to the `dev` branch on the remote repository.
2. Manually trigger the development workflow with the `trigger-dev-deploy.ts` script:
   ```bash
   npx ts-node terraform/trigger-dev-deploy.ts
   ```
3. Review the deployment logs and verify the changes in the development environment.

### Staging Environment

1. After testing in the development environment, merge changes from `dev` to `stage` branch.
2. This will automatically trigger the staging deployment.
3. Run appropriate tests in the staging environment to ensure everything is working as expected.

### Production Environment

1. Once changes have been thoroughly tested in staging, merge from `stage` to `prod` branch.
2. This will trigger the production deployment.
3. Monitor the deployment closely and perform post-deployment checks.

## Updating ECS Task Definition

1. Modify the `task-definition.json` in the `terraform` directory if needed.
2. Add any new environment variables to the `environment` section.
3. Update GitHub Actions workflows to replace placeholders with corresponding GitHub Secrets.
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