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

#### 4.2.1 GitHub Secrets

For secure management of deployment-related sensitive data, set up the following GitHub Secrets:

1. Go to Settings->Environments in your GitHub repository and create Environments for `staging` and `production`. Implement protection so that only the `stage` and `prod` branches can deploy to their respective environments.
2. Add the following secrets to each environment:
   - `AWS_ACCESS_KEY_ID`: Your AWS Access Key ID (see 4.3 IAM Users, Groups, and Policies below)
   - `AWS_SECRET_ACCESS_KEY`: Your AWS Secret Access Key
   - `OPEN_EXCHANGE_RATES_API`: Your Open Exchange Rates API key
   - `JWT_SECRET`: Secret key for JWT token generation and verification
   - `WHATSAPP_BOT_API_KEY`: WhatsApp Bot API key

#### 4.2.2 AWS Secrets Manager

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

### 4.2.3 IAM Users, Groups, and Policies

To manage access to AWS resources for deployment, we use the IAM setup below. This is to create and define the users that give us the AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY above.

1. IAM Users:

   - `credex-core-staging-deployment`: User for staging deployments
   - `credex-core-production-deployment`: User for production deployments.

2. IAM Group:

   - `credex-core-deployment`: Group that includes both deployment users.

3. IAM Policy:
   - `credex-core-permissions`: Policy that defines the permissions needed for deployment. This script is saved in the AWS IAM console, and executed there. A current copy is manually saved in our docs directory [here](docs/deploy/credex-permissions.json).

The `credex-core-permissions` policy is attached to the `credex-core-deployment` group, granting necessary permissions to both staging and production deployment users.

#### Updating IAM Policy

When Terraform scripts are modified, the IAM policy may need to be updated to reflect new resource requirements. Follow these steps to update the policy:

1. Review the changes made to the Terraform scripts, particularly in `main.tf`.
2. Identify any new AWS resources or actions that are being used.
   - review against the copy of the [credex-core-permissions](docs/deploy/credex-permissions.json) file stored in the docs folder of this repo for reference.
   - if changes made to Terraform scripts requires an update to permissions policies in AWS, move to step 3 below.
3. Update the `credex-core-permissions` policy in the AWS IAM console:
   - Go to the IAM console and find the `credex-core-permissions` policy.
   - Click "Edit policy" and switch to the JSON editor.
   - Add or modify the necessary permissions based on the Terraform changes.
   - Ensure you follow the principle of least privilege, granting only the permissions required for the deployment process.
   - Save the new policy in our local copy of [credex-core-permissions](docs/deploy/credex-permissions.json).
   - Paste and save the updated policy in the AWS console.
4. Test the deployment process to ensure all necessary permissions are in place.

Remember to document any significant changes to the IAM policy in your project's change log or documentation.

#### Creating and Refining IAM Policy

We have had to establish an IAM policy broader than desired because our attmpts to narrow it resulted in not all services being covered. This policy should be tightened in the future. When creating or updating the IAM policy, follow these guidelines:

1. Start with a Broad Policy: Initially, you may need to use a broad policy that grants permissions to multiple AWS services. Here's an example of such a policy:


   Note: This broad policy is not ideal from a security standpoint but ensures that the deployment process has all necessary permissions.

2. Refine the Policy: Over time, refine this policy based on the actual needs of your deployment process. Use AWS CloudTrail logs to identify which actions and services are actually being used.

3. Use Least Privilege Principle: As you refine the policy, aim to grant only the permissions that are absolutely necessary for the deployment process.

4. Regular Review: Periodically review and update the policy, especially after making changes to the Terraform scripts or deployment process.

5. Use AWS IAM Access Analyzer: This tool can help you identify resources in your organization and accounts that are shared with an external entity.

6. Test Thoroughly: After any policy changes, thoroughly test the deployment process to ensure all necessary permissions are in place.

7. Document Changes: Keep a record of any significant changes to the IAM policy in your project's change log or documentation.

8. Consider Separate Policies: As your understanding of the required permissions grows, consider creating separate, more specific policies for different aspects of your deployment (e.g., one for ECS operations, another for ECR, etc.).

Remember, creating an effective IAM policy is an iterative process. Start broad to ensure functionality, then gradually tighten permissions as you gain more insights into your specific usage patterns.

## 5. Infrastructure Management

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


### 5.1 Manual Terraform management

1. Navigate to the `terraform` directory.
2. Run `terraform init` to initialize the Terraform working directory.
3. Review and modify the `main.tf` file if necessary (e.g., AWS region, instance types).
4. Run `terraform plan` to see proposed changes.
5. Run `terraform apply` to create or update the necessary AWS resources.

### 5.2 AWS Resources

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

### 5.3 Neo4j Deployment and Management

The project uses Neo4j for both staging and production environments, managed through Terraform.

1. Production Environment:

   - Neo4j Enterprise Edition
   - Two separate instances: LedgerSpace and SearchSpace
   - Deployed on AWS EC2 instances (m5.large)

2. Staging Environment:
   - Neo4j Community Edition
   - Two separate instances: LedgerSpace and SearchSpace
   - Deployed on AWS EC2 instances (t3.medium)

Neo4j instances are defined and deployed automatically through the Terraform configuration in `terraform/main.tf`, including:

- Creation of EC2 instances
- Configuration of security groups
- Setting up AWS Secrets Manager to store connection details

Neo4j instances are configured using the `user_data` script in the EC2 instance definitions within the Terraform configuration. Security groups in `terraform/main.tf` are pre-configured to restrict access to the Neo4j instances as needed.

### 5.4 Neo4j AMI Management

We have implemented an automated process for managing Neo4j AMIs (Amazon Machine Images) using Terraform. This process ensures that Neo4j instances are always running the latest version and that updates are handled efficiently.

#### AMI Creation and Update Process

1. **Initial AMI Creation**:
   - When no Neo4j AMI exists, the Terraform script automatically creates a new AMI.
   - It launches a temporary EC2 instance, installs Neo4j, and creates an AMI from this instance.
   - The AMI is tagged with the Neo4j version for easy identification.

2. **Update Checking**:
   - On subsequent Terraform runs, the script checks for the existence of a Neo4j AMI.
   - If an AMI exists, it compares the current version with the latest available Neo4j version.

3. **Automatic Updates**:
   - If a newer Neo4j version is available, the script creates a new AMI with the updated version.
   - The new AMI is created using the same process as the initial creation.

4. **Version Management**:
   - The Neo4j version is managed through a Terraform variable `neo4j_version`.
   - When a new AMI is created due to an update, the script updates the `terraform.tfvars` file with the new version.

5. **Instance Configuration**:
   - All Neo4j instances (production and staging) use the latest AMI automatically.
   - The `depends_on` attribute ensures that the AMI management process completes before instance creation.

#### Implementation Details

The AMI management process is implemented in the `null_resource.neo4j_ami_management` resource in `terraform/main.tf`. Key components include:

- A bash script that handles AMI creation, update checking, and version management.
- Use of AWS CLI commands to interact with EC2 and create AMIs.
- A function to fetch the latest Neo4j version from the official website.
- Logic to compare versions and decide whether an update is necessary.

#### Benefits

- Ensures Neo4j instances are always running the latest version.
- Automates the process of creating and updating AMIs.
- Maintains version consistency across all Neo4j instances.
- Allows for easy rollback by keeping previous AMIs (implementation of AMI retention policy is recommended).

#### Considerations

- Ensure proper IAM permissions are in place for AMI creation and management.
- Monitor the AMI creation process, especially in production environments.
- Implement a retention policy for old AMIs to manage storage costs.
- Regularly review and update the AMI creation script to ensure it remains compatible with the latest Neo4j versions and AWS best practices.

## 6. Deployment Process

### 6.1 Staging Deployment

1. Push changes to the `stage` branch.
2. The `deploy-staging.yml` GitHub Actions workflow will automatically:
   - Build the Docker image
   - Push the image to ECR
   - Update the ECS task definition with staging-specific environment variables
   - Deploy to the staging ECS cluster

### 6.2 Production Deployment

1. Push changes to the `prod` branch.
2. The `deploy-production.yml` GitHub Actions workflow will automatically:
   - Build the Docker image
   - Push the image to ECR
   - Update the ECS task definition with production-specific environment variables
   - Deploy to the production ECS cluster

## 7. Monitoring and Logging

### 7.1 CloudWatch Logs

ECS task logs are sent to CloudWatch Logs:

- Log group: `/ecs/credex-core`
- Log stream prefix: `ecs`
- AWS region: af-south-1 (Cape Town)

To access the logs:

1. Go to the AWS CloudWatch console
2. Navigate to Log groups
3. Select the `/ecs/credex-core` log group
4. Browse the log streams to find the logs for specific tasks

### 7.2 Monitoring

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
- For AMI creation issues, review the logs of the `null_resource.neo4j_ami_management` execution in Terraform output.

## 9. Security Considerations

- Use GitHub Secrets for deployment-related sensitive data.
- Use AWS Secrets Manager for application secrets in staging and production environments.
- Regularly rotate passwords, API keys, and AWS access keys.
- Ensure production databases are not accessible from development or staging environments.
- Implement proper access controls and network security in your AWS environment.
- Restrict access to Neo4j instances by updating security group rules in Terraform.
- Ensure LedgerSpace and SearchSpace instances are properly isolated and secured.
- Implement least privilege access for IAM roles used by ECS tasks to access AWS resources.
- Regularly review and update IAM policies, especially those related to AMI management.

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

1. To update Neo4j versions:
   - The AMI management process will automatically check for new versions and create new AMIs as needed.
   - Run `terraform apply` to apply the changes and update the instances with the new AMI.
2. To update Neo4j configurations:
   - Modify the `user_data` scripts in the `terraform/main.tf` file.
   - Run `terraform apply` to apply the changes.
3. For major version upgrades or changes that require data migration:
   - Plan the upgrade process carefully.
   - Consider creating a backup of the existing data.
   - Test the upgrade process in a staging environment first.
   - Schedule downtime if necessary for the upgrade process.

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
- Implement a retention policy for old Neo4j AMIs
- Enhance the AMI management process to include automated testing of new AMIs before use

By continuously improving the deployment process and infrastructure, you can ensure the reliability, security, and efficiency of the credex-core application across all environments.
