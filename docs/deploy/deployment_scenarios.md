# Deployment Scenarios

This document outlines various deployment scenarios for the credex-core application and provides guidance on how to handle each situation. Understanding these scenarios is crucial for maintaining a robust and reliable deployment process across development, staging, and production environments.

## 1. Initial Deployment

During the initial deployment, the Neo4j instances are created, but their Bolt URLs are not yet known. Here's how to handle this scenario:

1. The Terraform script creates the Neo4j instances and outputs their private IP addresses.
2. The application's `config/config.ts` file is set up to use default Bolt URLs (`bolt://localhost:7687`) if the environment variables are not provided.
3. Proceed with the initial deployment using these default URLs.
4. After deployment, retrieve the actual Bolt URLs from the Terraform outputs:
   ```bash
   terraform output neo4j_ledger_bolt_url
   terraform output neo4j_search_bolt_url
   ```
5. Update the GitHub Environment secrets with these Bolt URLs for future deployments:
   - `NEO_4J_LEDGER_SPACE_BOLT_URL`
   - `NEO_4J_SEARCH_SPACE_BOLT_URL`

## 2. Deployment with No Changes to Neo4j Instances

For deployments where there are no changes to the Neo4j instances:

1. The Terraform script will detect no changes to the Neo4j-related resources.
2. The application will use the Bolt URLs stored in the GitHub Environment secrets.
3. Proceed with the deployment, updating only the application code and configuration.

## 3. Deployments with Changes to Neo4j Instances

**CAUTION:** This scenario could potentially wipe data in production. Ensure proper backups are in place before proceeding.

When changes are made to the Neo4j instances (e.g., version updates, configuration changes):

1. Modify the Neo4j-related resources in the `terraform/main.tf` file as needed.
2. Run `terraform plan` to review the proposed changes.
3. Apply the changes using `terraform apply`.
4. After the changes are applied, check if the Bolt URLs have changed:
   ```bash
   terraform output neo4j_ledger_bolt_url
   terraform output neo4j_search_bolt_url
   ```
5. If the Bolt URLs have changed, update the GitHub Environment secrets accordingly.
6. Proceed with the application deployment, which will now use the updated Neo4j instances.

## 4. Rolling Back a Deployment

If issues are encountered after a deployment on `staging` or `production` branches:

1. Identify the last known good deployment (commit/tag).
2. Revert the changes in the respective branch.
3. Push the revert commit to trigger a new deployment with the previous working version.
4. Monitor the rollback deployment and verify that the issue is resolved.

## 5. Handling Database Migrations

When deploying changes that include database schema updates:

1. Ensure the migration scripts are thoroughly tested in lower environments.
2. Back up the production database before applying migrations.
3. Consider using a blue-green deployment strategy to minimize downtime:
   - Deploy the new version with migrations to a new set of instances.
   - Run migrations on the new instances.
   - Switch traffic to the new instances once migrations are complete.
   - Keep the old instances running for a period in case of rollback needs.

## 6. Scaling the Application

When increased capacity is needed:

1. Update the `desired_count` in the ECS service configuration in `terraform/main.tf`.
2. Apply the changes using Terraform:
   ```bash
   terraform apply
   ```
3. Monitor the scaling process in the ECS console.
4. Verify that the load balancer is correctly routing traffic to all instances.

## 7. Deploying Configuration Changes

When deploying changes to application configuration:

1. Update the relevant environment variables in the GitHub Environment secrets.
2. Trigger a new deployment to the target environment.
3. Verify that the new configuration is correctly applied by checking application logs and behavior.

## 8. Emergency Hotfix Deployment

For critical issues requiring immediate fixes:

1. Create a hotfix branch from the current production version.
2. Implement and test the fix in the hotfix branch.
3. Deploy the hotfix to staging for verification.
4. Once verified, merge the hotfix branch to `prod` and deploy to production.
5. After the emergency is resolved, ensure the fix is also applied to the `dev` and `stage` branches.

## Best Practices for All Deployment Scenarios

1. Always review the Terraform plan carefully before applying changes, especially for production environments.
2. Ensure proper backups are in place before any deployment, especially those involving database changes.
3. After applying changes to Neo4j instances, always verify the Bolt URLs and update the GitHub Environment secrets if necessary.
4. Implement a post-deployment verification step that checks the application's connection to the Neo4j instances and overall health.
5. Keep the team informed about deployments, especially for production changes.
6. Maintain a deployment log to track all changes and their outcomes.

By following these guidelines for various deployment scenarios, you can ensure smooth and reliable deployments across all environments for the credex-core application.