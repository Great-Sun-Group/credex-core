# Infrastructure Management

This document outlines the process of managing the infrastructure for the credex-core application using Terraform and AWS services.

## Automated Deployment and Verification Process

We have implemented an automated process that handles both the deployment and verification of the application across all environments (development, staging, and production). This process includes the following steps:

1. AWS credentials verification
2. Neo4j credentials verification
3. Terraform deployment
4. ECS service stability check
5. API health check

The deployment process is managed through a unified GitHub Actions workflow, which can be triggered automatically for staging and production environments, or manually for any environment.

## Key Files in the Deployment Process

- GitHub Actions Workflow:
  - `.github/workflows/deploy.yml`: Unified workflow for all environments (development, staging, production)

- Terraform Configuration:
  - `terraform/main.tf`: Main Terraform configuration including Neo4j-related resources
  - `terraform/neo4j.tf`: Specific Terraform configuration for Neo4j instances
  - `terraform/networking.tf`: Network-related resources configuration
  - `terraform/variables.tf`: Terraform variables definition

- Other Important Files:
  - `terraform/task-definition.json`: ECS task definition template
  - `tests/neo4j_validation.sh`: Neo4j validation tests
  - `.github/workflows/post_deployment_tests.js`: Post-deployment API tests

## Terraform Deployment Process

The Terraform deployment process is designed to create and manage the necessary AWS resources for the credex-core application. Key aspects of this process include:

1. **Environment-specific Configurations**: Separate Terraform workspaces are used for development, staging, and production environments.

2. **Resource Creation**: The process creates various AWS resources including ECS clusters, EC2 instances for Neo4j, security groups, and networking components.

3. **Neo4j Instance Management**: Terraform manages the creation and configuration of Neo4j instances, including the application of the Enterprise license.

4. **Secrets Management**: Sensitive information such as database credentials and API keys are managed through GitHub Secrets and injected into the ECS task definition.

5. **Output Management**: After resource creation, important information like Neo4j Bolt URLs are output and stored as GitHub Secrets for use in the application.

## Manual Terraform Management

If you need to manage Terraform manually, follow these steps:

1. Navigate to the `terraform` directory.
2. Run `terraform init` to initialize the Terraform working directory.
3. Select the appropriate workspace for your environment (e.g., `terraform workspace select production`).
4. Review and modify the `main.tf` file if necessary.
5. Run `terraform plan` to see proposed changes.
6. Run `terraform apply` to create or update the necessary AWS resources.

## ECS Task Definition

The ECS task definition is managed using a template file [task-definition.json](../../terraform/task-definition.json). To update the task definition:

1. Modify the `task-definition.json`.
2. Ensure any new environment variables are added to the `environment` section.
3. Update the GitHub Actions workflow to replace placeholders with the corresponding GitHub Secrets.

## ECS Service Configuration

The ECS service is configured in the `main.tf` file, including:

- Service name: "credex-core-service-${environment}"
- Cluster: "credex-cluster-${environment}"
- Launch type: FARGATE
- Desired count: 1 (adjustable based on load requirements)
- Network configuration and security group settings

## Neo4j Deployment and Management

The project uses Neo4j Enterprise Edition for all environments, managed through Terraform.

1. Production Environment:
   - Two separate instances: LedgerSpace and SearchSpace
   - Deployed on AWS EC2 instances (r5.12xlarge)

2. Staging Environment:
   - Two instances: LedgerSpace and SearchSpace
   - Deployed on AWS EC2 instances (r5.2xlarge)

3. Development Environment:
   - Two instances: LedgerSpace and SearchSpace
   - Deployed on AWS EC2 instances (t3.xlarge)

Neo4j instances are defined and deployed automatically through the Terraform configuration in `terraform/main.tf` and `terraform/neo4j.tf`.

Key aspects of Neo4j deployment:
- The Neo4j Enterprise license is stored as a GitHub secret (`NEO4J_ENTERPRISE_LICENSE`) and must be inputted manually.
- Deployment workflows retrieve the license and pass it to Terraform.
- Terraform provisions Neo4j instances and applies the license.
- Neo4j bolt URLs are generated during deployment and stored as GitHub secrets.

### Neo4j Access Management

The deployment process manages several key components for secure Neo4j access:

1. Neo4j Usernames:
   - Purpose: Used for authentication to the Neo4j database.
   - Generation: Created during the deployment process as "neo4j" followed by 6 random digits.
   - Storage: Generated and stored as GitHub Secrets for each environment.

2. Neo4j Passwords:
   - Purpose: Used for authentication to the Neo4j database.
   - Generation: Secure, random passwords created during the deployment process.
   - Storage: Generated and stored as GitHub Secrets for each environment.

3. Neo4j Bolt URL:
   - Purpose: Used for connecting to the Neo4j database.
   - Generation: Created during the deployment process based on the EC2 instance's private IP.
   - Storage: Generated and stored as GitHub Secrets for each environment.

4. SSH Key Pair:
   - Purpose: Used for secure SSH access to the EC2 instances running Neo4j.
   - Generation: Created during the initial deployment process.
   - Storage: 
     - Public key: Stored in AWS EC2 Key Pairs.
     - Private key: Stored as a GitHub Secret for secure access.

These components are generated during the initial deployment process for both LedgerSpace and SearchSpace databases. The deployment process will output these secrets once for secure manual storage, ensuring they are not lost. For subsequent deployments, these secrets are retrieved from the appropriate GitHub environment.

### Additional Managed Variables

The following variables are also managed through the deployment process:

1. Neo4j Enterprise License:
   - Purpose: Enables Enterprise features of Neo4j.
   - Storage: Stored as a GitHub Secret, manually inputted.

2. AWS Region:
   - Purpose: Regional AWS cluster to deploy to.
   - Value: Stored as a GitHub Secret, manually inputted.

3. Domain Name:
   - Purpose: Used for configuring DNS and SSL certificates.
   - Value: Hardcoded based on the deployment environment.

4. External Service Credentials:
   - Purpose: Authentication for any external services integrated with the application.
   - Storage: Stored as GitHub Secrets.

Usage in Terraform and Deployment:
- All these secrets and variables are retrieved from GitHub Secrets and used in the Terraform scripts and EC2 user data to set up and configure the Neo4j databases and associated infrastructure.
- Separate credentials and configurations are maintained for LedgerSpace and SearchSpace instances, as well as for different environments (development, staging, production).

## Neo4j License Management

We use a Neo4j Enterprise Startup Edition license with the following limitations:
- Up to 3 Machines for production use (24 Cores / 256 GB RAM each)
- Up to 6 Machines for development
- Up to 3 Machines for non-production internal testing (e.g., staging)

Our current allocation:
- Production: 2 instances (1 LedgerSpace, 1 SearchSpace)
- Staging: 2 instances (1 LedgerSpace, 1 SearchSpace)
- Development: 2 instances (1 LedgerSpace, 1 SearchSpace)

License management process:
1. The license is stored as a secret in GitHub Actions (`NEO4J_ENTERPRISE_LICENSE`).
2. During deployment, the license is retrieved and applied to Neo4j instances.
3. Instance counts and specifications are enforced through Terraform configurations in `terraform/neo4j.tf` and `terraform/variables.tf`.
4. Pre-deployment checks verify compliance with license limitations.
5. Regular audits are conducted to ensure ongoing compliance.

To update the license:
1. Obtain the new license file from Neo4j.
2. Update the `NEO4J_ENTERPRISE_LICENSE` secret in GitHub Environments.
3. Trigger a new deployment to apply the updated license.

Monitoring and Alerts:
- AWS CloudWatch alarms are set up to monitor Neo4j instance metrics.
- Alerts are configured for approaching resource limits (cores, RAM).
- License expiration alerts are set up to provide ample time for renewal.

Renewal Process:
1. Monitor for license expiration alerts.
2. Initiate renewal process with Neo4j at least 30 days before expiration.
3. Upon receiving the new license key, update the GitHub Secret.
4. Test the new license key in the development environment before applying to staging and production.

Responsibilities:
- DevOps Team: Manage deployment configurations, monitor compliance, and handle license key updates.
- Development Team: Adhere to instance limitations during development and testing.
- Management: Oversee license renewal process and ensure budget allocation.

We conduct quarterly reviews of this license management process to ensure it remains effective and up-to-date with our usage patterns and Neo4j's licensing terms.

## Neo4j AMI Management

We have implemented an automated process for managing Neo4j AMIs using Terraform. This process ensures that Neo4j instances are always running the latest version and that updates are handled efficiently. **This needs attention, a new AMI will prompt DB wipes if our safeguards don't catch it**

1. The AMI management process automatically checks for new Neo4j versions.
2. If a new version is available, it creates a new AMI with the updated version.
3. The `terraform/main.tf` file references these AMIs for Neo4j instance creation.

To update Neo4j instances:

1. Run `terraform plan` to see if any changes are detected due to new AMIs.
2. If changes are detected, run `terraform apply` to update the instances with the new AMI.

Remember to always review the Terraform plan carefully before applying changes, especially when dealing with production environments.

## Post-Deployment Configuration

A `null_resource` in `terraform/main.tf` is used to update the GitHub Secrets with the actual Neo4j instance details after they are created. This step is crucial for managing the Bolt URLs and ensuring that the correct Neo4j connection information is available for the application to use.

The post-deployment configuration process:
1. Retrieves the actual Neo4j instance details (e.g., private IP addresses) from the newly created EC2 instances.
2. Constructs the Neo4j Bolt URLs using these IP addresses.
3. Updates the GitHub Secrets with the new Bolt URLs.
4. Ensures that the application can access the correct Neo4j connection information for both LedgerSpace and SearchSpace.

This step is crucial for maintaining the correct configuration across deployments and updates, especially for dynamically generated values like Bolt URLs.

## Accessing Neo4j Connection Details in the Application

The application retrieves Neo4j connection details (including Bolt URLs) from environment variables set in the ECS task definition. These environment variables are populated with values from GitHub Secrets:

- `NEO_4J_LEDGER_SPACE_BOLT_URL`
- `NEO_4J_LEDGER_SPACE_USER`
- `NEO_4J_LEDGER_SPACE_PASS`
- `NEO_4J_SEARCH_SPACE_BOLT_URL`
- `NEO_4J_SEARCH_SPACE_USER`
- `NEO_4J_SEARCH_SPACE_PASS`

These variables allow the application to securely access the Neo4j connection details without the need for hardcoded values.

## Testing and Validation

Our deployment process includes several validation steps:

1. Neo4j Validation Tests:
   - Located in `./tests/neo4j_validation.sh`
   - Run after Terraform apply in each environment's deployment workflow
   - Verifies Neo4j connectivity and basic functionality

2. Post-Deployment Tests:
   - Located in `.github/workflows/post_deployment_tests.js`
   - Run after ECS service deployment in each environment
   - Validates API functionality and integration with Neo4j

For additional test cases to ensure license compliance and verify Neo4j Enterprise Edition functionality, refer to [Neo4j License Validation Test Cases](./testing/neo4j_license_validation.md).

By following these infrastructure management practices, you can ensure that your credex-core application is running on up-to-date and properly configured infrastructure across all environments, with secure and efficient Neo4j deployment and access management.

## Handling of Bolt URLs in Different Environments

- In all environments, Bolt URLs are dynamically generated during the deployment process and stored as GitHub Secrets.
- The application configuration (`config/config.ts`) retrieves these URLs from environment variables set in the ECS task definition.
- For local development, developers can set these environment variables manually or use a local `.env` file.

## AWS Credentials and Permissions

- AWS credentials (access key and secret access key) are not stored in the application configuration.
- The necessary AWS permissions are managed through the ECS task role, adhering to the principle of least privilege and enhancing security.
- In the GitHub Actions workflow, AWS credentials are used only for the deployment process and are stored as GitHub secrets.
