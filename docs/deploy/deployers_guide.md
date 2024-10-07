# Deployer's Guide for Development, Staging, and Production

This document outlines the deployment process for the credex-core application in development, staging, and production environments.

Application updates can be done by developers and tested locally without the AWS permissions or keys. After developer testing, these changes can be merged to `dev`, merged to `stage` (potentially in batches) which will auto-deply for testing in the `staging` environment. When tests have passed, `stage` can be merged to `prod`, which will auto-deploy (to be changed to deploy at end of DCO every 24h).

**Any work that changes files in /.github/workflows and /terraform impacts the application deployment process**, and must first be tested on the `dev` branch by a developer with the AWS and Github App access keys. For the purpose of this document, a developer with the AWS access codes is a "deployer".

The development terminal (codespaces or local) can only trigger the workflows in the main branch of the remote repo  which in our case is the `dev` branch, so a deployer must do their work directly on that branch, push changes, then call the development deployment script with:
```
node terraform/github-app-auth.ts
```
This script will:
- Authenticate with the development GitHub App
- Fetch development-specific secrets from the Development environment
- Trigger the development deployment workflow
- Run follow up tests

Note: This script is intended for use in the development environment. It's a full dry run privately before going to stage.

Note to code reviewers: Developers are technically able to make changes to deployment code. But such changes should not be made by anyone who can't test them, and should not be deployed to `stage` untested.

This document outlines the test deployment process that the above command triggers from the remote `dev` branch, and outlines the nearly identical deployments that will happen automatically once changes are pushed to `stage` and `prod` branches.

## 1. Introduction

The credex-core application is deployed using AWS services (including ECS, ECR), Terraform for infrastructure management, and GitHub Actions for CI/CD. This guide provides comprehensive instructions for setting up, deploying, and maintaining the application across all environments.

## 2. Prerequisites
In addition to the developer's prerequisites outlined in [Developer's Guide to Deployment Process](docs/develop/dev_env_setup.md), deployer's also require these to be set in their env for the Development Deployment Github App:

- `GH_APP_ID`
- `GH_INSTALLATION_ID`
- `GH_APP_PRIVATE_KEY`

## 3. Environment Setup

### Development, Staging, and Production

All environments are managed through AWS ECS and deployed via GitHub Actions. The initial setup process is as follows:

1. Set up GitHub Apps and Environments for deployment (detailed in section 4.2).
2. Set up Terraform (detailed in section 6.1).
3. Configure AWS credentials in your local environment (detailed in section 4.2.2).

### Environment Variables

The `NODE_ENV` variable is set during the deployment process:

- For development deployments, it's set to 'development' by default
- For staging deployments, it's set to 'staging'
- For production deployments, it's set to 'production'

The following environment variables must be set in Github Environment and imported by the Github App for the deployment to succeed:

- `AWS_ACCESS_KEY`
- `AWS_SECRET_ACCESS_KEY`
- `NEO_4J_LEDGER_SPACE_USER`
- `NEO_4J_LEDGER_SPACE_PASS`
- `NEO_4J_SEARCH_SPACE_USER`
- `NEO_4J_SEARCH_SPACE_PASS`
- `OPEN_EXCHANGE_RATES_API`
- `JWT_SECRET`
- `WHATSAPP_BOT_API_KEY`

The following environment variables are optional, because on first deployment they do not exist. First deployment provides the values, which then must be set in their respective environment. Subsequent deployments that redeploy neo4j (excercise caution with this! docs to be created) will provide new Bolt URLs, which must be updated in the respective environment.

- `NEO_4J_LEDGER_SPACE_BOLT_URL`
- `NEO_4J_SEARCH_SPACE_BOLT_URL`

These variables are set in GitHub Environments for staging and production deployments. For development deployments, they should be set in the local environment.

### IAM Users, Groups, and Policies

To manage access to AWS resources for deployment, we use the following IAM setup:

1. IAM Users:
   - `credex-core-development-deployment`: User for development deployments
   - `credex-core-staging-deployment`: User for staging deployments
   - `credex-core-production-deployment`: User for production deployments

2. IAM Group:
   - `credex-core-deployment`: Group that includes all deployment users

3. IAM Policy:
   - `credex-core-permissions`: Policy that defines the permissions needed for deployment

The `credex-core-permissions` policy is attached to the `credex-core-deployment` group, granting necessary permissions to all deployment users. While stored and implemented in AWS, and updated through the console, we keep a local copy of this policy up to date at [credex-permissions.json](docs/deploy/credex-permissions.json).

### Updating IAM Policy

When Terraform scripts are modified, the IAM policy may need to be updated. Follow these steps:

1. Review changes made to the Terraform scripts, particularly in `main.tf`.
2. Identify any new AWS resources or actions being used.
3. Update the `credex-core-permissions` policy in the AWS IAM console.
4. Test the deployment process to ensure all necessary permissions are in place.

## 4. Infrastructure Management

We have implemented an automated process that handles both the deployment and verification of the application. This process includes the following steps:

1. AWS credentials verification
2. Neo4j credentials verification
3. Terraform deployment

To be added to the above:
4. ECS service stability check
2. API health check

To run the automated deployment and verification process, ensure you're in the project root directory and run:
```
node terraform/github-app-auth.ts
```

### Manual Terraform management

1. Navigate to the `terraform` directory.
2. Run `terraform init` to initialize the Terraform working directory.
3. Review and modify the `main.tf` file if necessary.
4. Run `terraform plan` to see proposed changes.
5. Run `terraform apply` to create or update the necessary AWS resources.

### ECS Task Definition

The ECS task definition is managed using a template file [task-definition.json](terraform/task-definition.json). To update the task definition:

1. Modify the `task-definition.json`.
2. Ensure any new environment variables are added to the `environment` section.
3. Update the GitHub Actions workflows to replace placeholders with the corresponding GitHub Secrets.

### ECS Service Configuration

The ECS service is configured in the `main.tf` file, including:

- Service name: "credex-core-service-${environment}"
- Cluster: "credex-cluster-${environment}"
- Launch type: FARGATE
- Desired count: 1 (adjustable based on load requirements)
- Network configuration and security group settings

### 5.3 Neo4j Deployment and Management

The project uses Neo4j for all environments, managed through Terraform.

1. Production Environment:
   - Neo4j Community Edition (temporary)
   - Two separate instances: LedgerSpace and SearchSpace
   - Deployed on AWS EC2 instances (m5.medium)

2. Staging and Development Environments:
   - Neo4j Community Edition
   - Two separate instances: LedgerSpace and SearchSpace
   - Deployed on AWS EC2 instances (t3.medium)

Neo4j instances are defined and deployed automatically through the Terraform configuration in `terraform/main.tf`.

### 5.4 Neo4j AMI Management

We have implemented an automated process for managing Neo4j AMIs using Terraform. This process ensures that Neo4j instances are always running the latest version and that updates are handled efficiently.

## 6. Deployment Process

### Automated Deployment via GitHub Actions

1. For staging: Push changes to the `stage` branch.
2. For production: Push changes to the `prod` branch.
3. For development: Manually trigger the workflow using the `github-app-auth.ts` script.

The respective GitHub Actions workflow will automatically:
- Build the Docker image
- Push the image to ECR
- Update the ECS task definition with environment-specific variables
- Deploy to the appropriate ECS cluster

### Environment-Specific Behavior

- **Production**: Deployments are triggered by pushes to the `prod` branch.
- **Staging**: Deployments are triggered by pushes to the `stage` branch.
- **Development**: Deployments are triggered manually using the `github-app-auth.ts` script.

## 7. Monitoring and Logging

### CloudWatch Logs

ECS task logs are sent to CloudWatch Logs:

- Log group: `/ecs/credex-core-${environment}`
- Log stream prefix: `ecs`
- AWS region: af-south-1 (Cape Town)

### Monitoring

Consider setting up CloudWatch Alarms for important metrics such as:

- CPU and Memory utilization of ECS tasks
- Number of running tasks
- Application-specific metrics (if pushed to CloudWatch)

## 8. Troubleshooting

- Check GitHub Actions logs for deployment failure error messages.
- Verify all required secrets are correctly set up in GitHub repository secrets.
- Ensure the ECS task definition is correctly updated with the new image and environment variables.
- For application issues, check CloudWatch logs for the ECS tasks.
- For Neo4j issues, check EC2 instance logs and ensure the `user_data` script executed correctly.
- For AMI creation issues, review the logs of the `null_resource.neo4j_ami_management` execution in Terraform output.

## 9. Security Considerations

- Use GitHub Secrets for all sensitive data.
- Regularly rotate passwords, API keys, and AWS access keys.
- Ensure production databases are not accessible from development or staging environments.
- Implement proper access controls and network security in your AWS environment.
- Restrict access to Neo4j instances by updating security group rules in Terraform.
- Ensure LedgerSpace and SearchSpace instances are properly isolated and secured.
- Implement least privilege access for IAM roles used by ECS tasks to access AWS resources.
- Regularly review and update IAM policies, especially those related to AMI management.
- Be aware of potential secret synchronization issues between infrastructure and application deployments. Infrastructure updates are triggered only when changes are detected, while application deployments always use the latest secrets from GitHub Actions. This could lead to mismatches, especially during secret rotation. A comprehensive secret management and rotation strategy should be implemented to address this issue in the future.
- Regularly rotate the GitHub Apps' private keys and update them in the respective GitHub Environments.
- Use environment protection rules for Staging and Production environments to require approvals before deployments.

## 10. Maintenance and Updates

### Updating the Application

1. For development: Push changes to `dev` on remote and manually trigger the development workflow with the `github-app-auth.ts` script.
2. For staging: Merge changes from `dev` to `stage` branch to trigger staging deployment, and run appropriate tests.
3. For production: Merge changes from `stage` to `prod` branch to trigger production deployment.

### Updating ECS Task Definition

1. Modify the `task-definition.json` in the `terraform` directory if needed.
2. Add any new environment variables to the `environment` section.
3. Update GitHub Actions workflows to replace placeholders with corresponding GitHub Secrets.

### Updating Neo4j Instances

1. To update Neo4j versions:
   - The AMI management process will automatically check for new versions and create new AMIs as needed.
   - Run `terraform apply` to apply the changes and update the instances with the new AMI.
2. To update Neo4j configurations:
   - Modify the `user_data` scripts in the `terraform/main.tf` file.
   - Run `terraform apply` to apply the changes.

## 11. Continuous Improvement

Consider the following improvements:

- Implement comprehensive post-deployment verification steps, including automated tests and health checks
- Add more comprehensive testing in the CI/CD pipeline
- Implement blue-green deployments for zero-downtime updates
- Set up automated rollback procedures for failed deployments
- Enhance monitoring and alerting for the deployed application and Neo4j instances
- Implement automated backups for all Neo4j instances
- Set up Neo4j clustering for high availability in the production environment
- Implement data synchronization or replication strategies between LedgerSpace and SearchSpace if required
- Implement a secrets rotation policy
- Set up monitoring and alerting for secrets access and usage
- Implement a retention policy for old Neo4j AMIs
- Enhance the AMI management process to include automated testing of new AMIs before use
- Set up a process for regularly auditing and updating IAM permissions based on the principle of least privilege
- Develop a strategy for securely sharing and updating AWS credentials among team members
- Implement a CLI wrapper around the `github-app-auth.ts` script to provide a more user-friendly interface for developers.
- Enhance the GitHub App authentication process to support multiple environments more seamlessly.

By continuously improving the deployment process and infrastructure, you can ensure the reliability, security, and efficiency of the credex-core application across all environments.

## 12. Deployment Scenarios

### 12.1 Initial Deployment

During the initial deployment, the Neo4j instances are created, but their Bolt URLs are not yet known. Here's how this scenario is handled:

1. The Terraform script creates the Neo4j instances and outputs their private IP addresses.
2. The application's `config/config.ts` file is set up to use default Bolt URLs (`bolt://localhost:7687`) if the environment variables are not provided.
3. The initial deployment proceeds with these default URLs.
4. After the deployment, retrieve the actual Bolt URLs from the Terraform outputs:
   ```
   terraform output neo4j_ledger_bolt_url
   terraform output neo4j_search_bolt_url
   ```
5. Update the GitHub Environment secrets with these Bolt URLs for future deployments:
   - `NEO_4J_LEDGER_SPACE_BOLT_URL`
   - `NEO_4J_SEARCH_SPACE_BOLT_URL`

### 12.2 Deployment with No Changes to Neo4j Instances

For deployments where there are no changes to the Neo4j instances:

1. The Terraform script will detect no changes to the Neo4j-related resources.
2. The application will use the Bolt URLs stored in the GitHub Environment secrets.
3. The deployment proceeds normally, updating only the application code and configuration.

### 12.3 Deployments with Changes to Neo4j Instances

*** NOTE that this could wipe the data in production. Protection has been implemented, but needs to be verfified and tested. The process should only be triggerable immeditaely after a backup.  ***

When changes are made to the Neo4j instances (e.g., version updates, configuration changes):

1. Modify the Neo4j-related resources in the `terraform/main.tf` file as needed.
2. Run `terraform plan` to review the proposed changes.
3. Apply the changes using `terraform apply`.
4. After the changes are applied, check if the Bolt URLs have changed:
   ```
   terraform output neo4j_ledger_bolt_url
   terraform output neo4j_search_bolt_url
   ```
5. If the Bolt URLs have changed, update the GitHub Environment secrets accordingly.
6. Proceed with the application deployment, which will now use the updated Neo4j instances.

### 12.4 Handling Bolt URL Updates

To ensure smooth transitions when Bolt URLs change:

*** THIS NEEDS REVIEW. WHAT HAPPENS HERE? ***
how do we get new bolt urls on updates to prod and stage? - we can get them from the workflow logs on github.
but if there is an update, does the app deploy with the updated value, or is it the one still in env? - must be confirmed

### 12.5 Best Practices for Neo4j Instance Changes

1. Always review the Terraform plan carefully before applying changes to Neo4j instances.
2. Consider the impact on data persistence when making changes to Neo4j instances. Ensure proper backup and migration strategies are in place.
3. After applying changes to Neo4j instances, always verify the Bolt URLs and update the GitHub Environment secrets if necessary.
4. Consider implementing a post-deployment verification step that checks the application's connection to the Neo4j instances.

By following these guidelines, you can ensure smooth deployments across various scenarios, including initial setup, routine updates, and infrastructure changes involving Neo4j instances.
