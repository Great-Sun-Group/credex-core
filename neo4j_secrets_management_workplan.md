# Neo4j Secrets Management Workplan

## Objective
Implement an automated, secure process for managing Neo4j connection details (bolt URL, username, password) using AWS Secrets Manager for production and staging environments, while maintaining the ability to use environment variables for local development.

## Progress

### Completed Steps
1. Updated Application Configuration:
   - Modified `config/config.ts` to use AWS Secrets Manager for production and staging environments.
   - Maintained the ability to use environment variables for local development.

2. Updated Application Code:
   - Updated `src/index.ts` to use the new asynchronous configuration.
   - Modified `src/utils/logger.ts` to work with the updated configuration.

3. Refactored Dev Routes:
   - Updated `src/api/Dev/devRoutes.ts` to align with the structure of other route files.
   - Removed the `updateMemberTier` route as it will be an internal service.

4. Updated Terraform Configuration:
   - Modified `terraform/main.tf` to add AWS Secrets Manager resources for storing Neo4j connection details.
   - Ensured the Terraform configuration aligns with the updated application code.

5. Updated GitHub Actions Workflow:
   - Modified the GitHub Actions workflow files to set the correct `NODE_ENV` environment variable for different deployment environments.

6. Testing and Validation:
   - Tested the updated configuration in the development environment to ensure all components work together correctly.
   - Verified that secrets are correctly retrieved from environment variables in the local development setup.

7. Documentation:
   - Updated project documentation in `docs/deployments.md` to reflect the new secrets management process.
   - Provided guidelines for developers on setting up their local environment variables for development.

## Remaining Steps

1. Security Audit:
   - Conduct a comprehensive security audit to ensure that sensitive information is properly protected throughout the deployment pipeline.
   - Review IAM roles and policies to ensure least privilege access.
   - Verify that all secrets are properly managed and not hardcoded in the codebase.

2. Rollout to Production:
   - Plan and execute the rollout of these changes to the staging environment.
   - After successful staging deployment, plan and execute the rollout to the production environment.

3. Monitoring and Maintenance:
   - Set up monitoring for AWS Secrets Manager access and usage.
   - Implement a rotation policy for the Neo4j passwords and update the Terraform code accordingly.

4. Final Testing and Verification:
   - Conduct thorough testing in both staging and production environments after the rollout.
   - Verify that all components are working correctly with the new secrets management system.

5. Team Training:
   - Provide training or documentation for the development team on the new secrets management process.
   - Ensure all team members understand how to work with the updated local development setup and deployment processes.

6. Continuous Improvement:
   - Establish a process for regularly reviewing and updating the secrets management system.
   - Plan for future enhancements, such as automated secret rotation or additional security measures.

By completing these remaining steps, we will have fully implemented a secure and efficient secrets management process for our Neo4j connection details across all environments.