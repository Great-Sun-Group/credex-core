# Deployer's Guide for Staging and Production

This document outlines the deployment process for the credex-core application in staging and production environments.

## 1. Introduction

The credex-core application is deployed using a combination of GitHub Actions, AWS services (including ECS, ECR, and Secrets Manager), and Terraform for infrastructure management. This guide provides comprehensive instructions for setting up, deploying, and maintaining the application in staging and production environments.

## 2. Prerequisites

- AWS account
- Terraform
- AWS CLI
- jq (command-line JSON processor)

## 3. Environment Setup

### 3.1 Staging and Production

Staging and production environments are managed through AWS ECS and deployed via GitHub Actions. The initial setup process is as follows:

1. Set up GitHub Secrets for AWS deployment (detailed in section 4.2).
2. Set up Terraform (detailed in section 6.1).

## 4. Configuration

### 4.1 Environment Variables

The application uses environment variables for configuration. These are defined in [config/config.ts](config/config.ts).

The `NODE_ENV` variable is set during the deployment process:
- For staging deployments, it's set to 'staging'
- For production deployments, it's set to 'production'

### 4.2 Secrets Management

#### GitHub Secrets

For secure management of deployment-related sensitive data, set up the following GitHub Secrets:

1. Go to your GitHub repository.
2. Navigate to Settings > Secrets.
3. Add the following secrets:
   - `AWS_ACCESS_KEY_ID`: Your AWS Access Key ID
   - `AWS_SECRET_ACCESS_KEY`: Your AWS Secret Access Key
   - `OPEN_EXCHANGE_RATES_API_STAGE`: Your Open Exchange Rates API key for staging
   - `OPEN_EXCHANGE_RATES_API_PROD`: Your Open Exchange Rates API key for production
   - `JWT_SECRET_STAGE`: Secret key for JWT token generation and verification in staging
   - `JWT_SECRET_PROD`: Secret key for JWT token generation and verification in production
   - `WHATSAPP_BOT_API_KEY_STAGE`: WhatsApp Bot API key for staging
   - `WHATSAPP_BOT_API_KEY_PROD`: WhatsApp Bot API key for production

#### AWS Secrets Manager

For staging and production environments, AWS Secrets Manager is used to securely store and manage Neo4j connection details.

1. The Terraform configuration in `terraform/main.tf` defines the necessary AWS Secrets Manager resources.
2. Two secrets are created:
   - `neo4j_prod_secrets` for the production environment
   - `neo4j_stage_secrets` for the staging environment
3. Each secret contains the following key-value pairs:
   - `ledgerspacebolturl`: Neo4j LedgerSpace Bolt URL
   - `ledgerspaceuser`: Neo4j LedgerSpace username
   - `ledgerspacepass`: Neo4j LedgerSpace password
   - `searchspacebolturl`: Neo4j SearchSpace Bolt URL
   - `searchspaceuser`: Neo4j SearchSpace username
   - `searchspacepass`: Neo4j SearchSpace password

The application is configured to retrieve these secrets at runtime in the staging and production environments.

## 5. Deployment Process

### 5.1 Staging Deployment

1. Push changes to the `stage` branch.
2. The `deploy-staging.yml` GitHub Actions workflow will automatically:
   - Build the Docker image
   - Push the image to ECR
   - Update the ECS task definition with staging-specific environment variables
   - Deploy to the staging ECS cluster

### 5.2 Production Deployment

1. Push changes to the `prod` branch.
2. The `deploy-production.yml` GitHub Actions workflow will automatically:
   - Build the Docker image
   - Push the image to ECR
   - Update the ECS task definition with production-specific environment variables
   - Deploy to the production ECS cluster

### 5.3 Deployment and Verification Process

We have implemented an automated process that handles both the deployment and verification of the application. This process includes the following steps:

1. Terraform deployment
2. ECS service stability check
3. ECS status check
4. API health check
5. Integration tests
6. Performance benchmarks

To run the complete deployment and verification process:

1. Ensure you're in the project root directory.
2. Run the following command:
   ```
   npm run deploy-and-verify
   ```

This command will execute the `deploy_and_verify.sh` script in the terraform directory, which handles the entire deployment and verification process.

## 6. Infrastructure Management

### 6.1 Terraform Management

The Terraform configurations for this project are managed automatically through the `deploy_and_verify.sh` script. This script handles Terraform initialization and application, removing the need for manual Terraform commands in most cases.

For manual Terraform management:

1. Navigate to the `terraform` directory.
2. Run `terraform init` to initialize the Terraform working directory.
3. Review and modify the `main.tf` file if necessary (e.g., AWS region, instance types).
4. Run `terraform plan` to see proposed changes.
5. Run `terraform apply` to create or update the necessary AWS resources.

### 6.2 AWS Resources

#### ECS Task Definition

The ECS task definition is managed using a template file [task-definition.json](terraform/task-definition.json). To update the task definition:

1. Modify the `task-definition.json`.
2. Ensure any new environment variables are added to the `environment` section with appropriate placeholders.
3. Update the GitHub Actions workflows to replace new placeholders with the corresponding GitHub Secrets or AWS Secrets Manager references.

#### ECS Service Configuration

The ECS service is configured in the `main.tf` file, including:
- Service name: "credex-core-service"
- Cluster: "credex-cluster"
- Launch type: FARGATE
- Desired count: 1 (adjustable based on load requirements)
- Network configuration and security group settings

### 6.3 Neo4j Deployment and Management

The project uses Neo4j for both staging and production environments, managed through Terraform.

#### Neo4j Instances

1. Production Environment:
   - Neo4j Enterprise Edition
   - Two separate instances: LedgerSpace and SearchSpace
   - Deployed on AWS EC2 instances (m5.large)

2. Staging Environment:
   - Neo4j Community Edition
   - Two separate instances: LedgerSpace and SearchSpace
   - Deployed on AWS EC2 instances (t3.medium)

#### Deployment Process

Neo4j instances are defined and deployed automatically through the Terraform configuration in `terraform/main.tf`, including:
- Creation of EC2 instances
- Configuration of security groups
- Setting up AWS Secrets Manager to store connection details

#### Configuration

- Neo4j instances are configured using the `user_data` script in the EC2 instance definitions within the Terraform configuration.
- Security groups in `terraform/main.tf` are pre-configured to restrict access to the Neo4j instances as needed.

## 7. Monitoring and Logging

### CloudWatch Logs

ECS task logs are sent to CloudWatch Logs:
- Log group: `/ecs/credex-core`
- Log stream prefix: `ecs`
- AWS region: af-south-1 (Cape Town)

To access the logs:
1. Go to the AWS CloudWatch console
2. Navigate to Log groups
3. Select the `/ecs/credex-core` log group
4. Browse the log streams to find the logs for specific tasks

### Monitoring

Consider setting up CloudWatch Alarms for important metrics such as:
- CPU and Memory utilization of ECS tasks
- Number of running tasks
- Application-specific metrics (if pushed to CloudWatch)

You can also use CloudWatch Dashboards to create visual representations of your application's performance and health.

## 8. Troubleshooting

- Check GitHub Actions logs for deployment failure error messages.
- Verify all required secrets are correctly set up in GitHub repository secrets and AWS Secrets Manager.
- Ensure the ECS task definition is correctly updated with the new image and environment variables.
- For application issues, check CloudWatch logs for the ECS tasks.
- For secrets retrieval issues, check IAM roles and policies to ensure ECS tasks have necessary permissions to access AWS Secrets Manager.
- For Neo4j issues, check EC2 instance logs and ensure the `user_data` script executed correctly.

## 9. Security Considerations

- Use GitHub Secrets for deployment-related sensitive data.
- Use AWS Secrets Manager for application secrets in staging and production environments.
- Regularly rotate passwords, API keys, and AWS access keys.
- Ensure production databases are not accessible from development or staging environments.
- Implement proper access controls and network security in your AWS environment.
- Restrict access to Neo4j instances by updating security group rules in Terraform.
- Ensure LedgerSpace and SearchSpace instances are properly isolated and secured.
- Implement least privilege access for IAM roles used by ECS tasks to access AWS resources.

## 10. Maintenance and Updates

### Updating the Application

1. Merge changes from `dev` to `stage` branch to trigger staging deployment.
2. Test the changes in the staging environment.
3. If everything works as expected, push to the `prod` branch to deploy to production.

### Updating ECS Task Definition

1. Modify the `task-definition.json` in the `terraform` directory if needed.
2. Add any new environment variables to the `environment` section with appropriate placeholders.
3. Update GitHub Actions workflows to replace new placeholders with corresponding GitHub Secrets or AWS Secrets Manager references.

### Updating Neo4j Instances

1. To update Neo4j versions or configurations:
   - Modify the `user_data` scripts in the `terraform/main.tf` file.
   - Run `terraform apply` to apply the changes.
   - Changes that recreate the databases are currently disallowed, pending proper backup processes being verified.

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
- Implement a secrets rotation policy for AWS Secrets Manager
- Set up monitoring and alerting for AWS Secrets Manager access and usage

By continuously improving the deployment process and infrastructure, you can ensure the reliability, security, and efficiency of the credex-core application across all environments.