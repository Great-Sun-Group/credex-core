# Deployer's Guide for Development, Staging, and Production

This document outlines the deployment process for the credex-core application in development, staging, and production environments.

## 1. Introduction

The credex-core application is deployed using AWS services (including ECS, ECR), Terraform for infrastructure management, and GitHub Actions for CI/CD. This guide provides comprehensive instructions for setting up, deploying, and maintaining the application across all environments.

## 2. Prerequisites

- AWS account
- Terraform
- AWS CLI
- GitHub CLI (gh)
- jq (command-line JSON processor)

## 3. Environment Setup

### 3.1 Development, Staging, and Production

All environments are managed through AWS ECS and deployed via GitHub Actions. The initial setup process is as follows:

1. Set up GitHub Secrets for deployment (detailed in section 4.2).
2. Set up Terraform (detailed in section 6.1).
3. Configure AWS credentials in your local environment (detailed in section 4.2.2).

## 4. Configuration

### 4.1 Environment Variables

The application uses environment variables for configuration. These are defined in [config/config.ts](config/config.ts).

The `NODE_ENV` variable is set during the deployment process:

- For development deployments, it's set to 'development'
- For staging deployments, it's set to 'staging'
- For production deployments, it's set to 'production'

Secrets (AWS) required for deployment are stored in the developers environment for dev deployments and in Github Actions/Environments *(finalize and update this)* for staging and production. AWS Paramaeter manager stores the various neo4j parameters.

### 4.2 Secrets Management

#### GitHub Secrets

For secure management of deployment-related sensitive data, set up the following GitHub Secrets:

1. Go to Settings->Environments in your GitHub repository and create Environments for `staging`, and `production`. Implement protection rules as needed.
2. Add the following application secrets to each environment. These are required for app development:
   - `JWT_SECRET`: Secret key for JWT token generation and verification
   - `WHATSAPP_BOT_API_KEY`: WhatsApp Bot API key
   - `OPEN_EXCHANGE_RATES_API`: Your Open Exchange Rates API key
   - `NEO4J_LEDGER_SPACE_BOLT_URL`: Neo4j LedgerSpace Bolt URL
   - `NEO4J_LEDGER_SPACE_USER`: Neo4j LedgerSpace username
   - `NEO4J_LEDGER_SPACE_PASS`: Neo4j LedgerSpace password
   - `NEO4J_SEARCH_SPACE_BOLT_URL`: Neo4j SearchSpace Bolt URL
   - `NEO4J_SEARCH_SPACE_USER`: Neo4j SearchSpace username
   - `NEO4J_SEARCH_SPACE_PASS`: Neo4j SearchSpace password
3. Add the following deployment secrets to each environment. These are additional requirements for developers working on the deployment process:
   - `AWS_ACCESS_KEY_ID`: for the user deploying (different for each developer, as well as set for staging and production users).
   - `AWS_SECRET_ACCESS_KEY`: for the user deploying (different for each developer, as well as set for staging and production users).
   - `GH_APP_PRIVATE_KEY`: Key for Github App that authorizes deployments.
   - 

#### IAM Users, Groups, and Policies

To manage access to AWS resources for deployment, we use the following IAM setup:

1. IAM Users:
   - `ryanlukewatson`: User for development deployments (others can be created as needed)
   - `credex-core-staging-deployment`: User for staging deployments
   - `credex-core-production-deployment`: User for production deployments

2. IAM Group:
   - `credex-core-deployment`: Group that includes all deployment users

3. IAM Policy:
   - `credex-core-permissions`: Policy that defines the permissions needed for deployment

The `credex-core-permissions` policy is attached to the `credex-core-deployment` group, granting necessary permissions to all deployment users. While stored and implemented in AWS, and updated through the console, we keep a local copy of this policy up to date at [credex-permissions.json](docs/deploy/credex-permissions.json).

#### Updating IAM Policy

When Terraform scripts are modified, the IAM policy may need to be updated. Follow these steps:

1. Review changes made to the Terraform scripts, particularly in `main.tf`.
2. Identify any new AWS resources or actions being used.
3. Update the `credex-core-permissions` policy in the AWS IAM console.
4. Test the deployment process to ensure all necessary permissions are in place.

## 5. Infrastructure Management

We have implemented an automated process that handles both the deployment and verification of the application. This process includes the following steps:

1. AWS credentials verification
2. Neo4j credentials verification
3. Terraform deployment
4. ECS service stability check
5. API health check

To run the complete deployment and verification process, ensure you're in the project root directory and run:
```
npm run deploy-and-verify
```

This command will execute the `deploy_and_verify.sh` script in the terraform directory, which handles the entire deployment and verification process.

### 5.1 Manual Terraform management

1. Navigate to the `terraform` directory.
2. Run `terraform init` to initialize the Terraform working directory.
3. Review and modify the `main.tf` file if necessary.
4. Run `terraform plan` to see proposed changes.
5. Run `terraform apply` to create or update the necessary AWS resources.

### 5.2 AWS Resources

#### ECS Task Definition

The ECS task definition is managed using a template file [task-definition.json](terraform/task-definition.json). To update the task definition:

1. Modify the `task-definition.json`.
2. Ensure any new environment variables are added to the `environment` section.
3. Update the GitHub Actions workflows to replace placeholders with the corresponding GitHub Secrets.

#### ECS Service Configuration

The ECS service is configured in the `main.tf` file, including:

- Service name: "credex-core-service-${environment}"
- Cluster: "credex-cluster-${environment}"
- Launch type: FARGATE
- Desired count: 1 (adjustable based on load requirements)
- Network configuration and security group settings

### 5.3 Neo4j Deployment and Management

The project uses Neo4j for all environments, managed through Terraform.

1. Production Environment:
   - Neo4j Enterprise Edition
   - Two separate instances: LedgerSpace and SearchSpace
   - Deployed on AWS EC2 instances (m5.large)

2. Staging and Development Environments:
   - Neo4j Community Edition
   - Two separate instances: LedgerSpace and SearchSpace
   - Deployed on AWS EC2 instances (t3.medium)

Neo4j instances are defined and deployed automatically through the Terraform configuration in `terraform/main.tf`.

### 5.4 Neo4j AMI Management

We have implemented an automated process for managing Neo4j AMIs using Terraform. This process ensures that Neo4j instances are always running the latest version and that updates are handled efficiently.

## 6. Deployment Process

### 6.1 Manual Deployment

#### 6.1.1 Using deploy-and-verify script

1. Ensure AWS credentials are properly set up in your local environment.
2. Set the `NODE_ENV` environment variable to either `production`, `staging`, or `development`.
3. Run `npm run deploy-and-verify` from the project root directory.
4. If `NODE_ENV` is set to `development`, select the target environment when prompted.
5. The script will verify AWS credentials, Neo4j credentials, handle the Terraform deployment, ECS service updates, and verification steps.

#### 6.1.2 Using deploy-dev-wrapper script

We have created a simplified deployment script `deploy-dev-wrapper.sh` located in the `.github/workflows` directory. This script streamlines the deployment process for development purposes. To use this script:

1. Ensure your AWS credentials are set up in your environment variables:
   ```bash
   export AWS_ACCESS_KEY_ID=your_access_key_id
   export AWS_SECRET_ACCESS_KEY=your_secret_access_key
   ```
2. Run the script from anywhere in the project:
   ```bash
   deploy-dev-wrapper.sh
   ```

The script will:
- Determine the current git branch
- Trigger the GitHub Actions workflow for deployment using the local version of the current branch

Note: This script is primarily intended for use in the development container environment. The script is automatically made executable and added to the PATH when the development container is built or started. It's a full dry run privately before going to stage.

### 6.2 Automated Deployment via GitHub Actions

1. For staging: Push changes to the `stage` branch.
2. For production: Push changes to the `prod` branch.
3. For development: Manually trigger the workflow from the GitHub Actions tab.

The respective GitHub Actions workflow will automatically:
- Build the Docker image
- Push the image to ECR
- Update the ECS task definition with environment-specific variables
- Deploy to the appropriate ECS cluster

### 6.3 Environment-specific Behavior

- **Production**: When `NODE_ENV=production`, the script will deploy to the production environment without prompting.
- **Staging**: When `NODE_ENV=staging`, the script will deploy to the staging environment without prompting.
- **Development**: When `NODE_ENV=development`, the script will prompt you to choose between deploying to production, staging, or development.

## 7. Monitoring and Logging

### 7.1 CloudWatch Logs

ECS task logs are sent to CloudWatch Logs:

- Log group: `/ecs/credex-core-${environment}`
- Log stream prefix: `ecs`
- AWS region: af-south-1 (Cape Town)

### 7.2 Monitoring

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

## 10. Maintenance and Updates

### Updating the Application

1. For staging: Merge changes from `dev` to `stage` branch to trigger staging deployment.
2. For production: Merge changes from `stage` to `prod` branch to trigger production deployment.
3. For development: Push changes to any branch and manually trigger the development workflow.

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

By continuously improving the deployment process and infrastructure, you can ensure the reliability, security, and efficiency of the credex-core application across all environments.
