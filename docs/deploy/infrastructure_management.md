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
  - `terraform/ssm.tf`: AWS Systems Manager configuration
  - `terraform/networking.tf`: Network-related resources configuration
  - `terraform/variables.tf`: Terraform variables definition

- Deployment Scripts:
  - `terraform/import_state.sh`: Script for importing existing resources into Terraform state
  - `terraform/pre_deployment_check.sh`: Pre-deployment checks script
  - `terraform/manage_workspaces.sh`: Terraform workspace management script
  - `terraform/cleanup_orphaned_resources.sh`: Script for cleaning up orphaned resources

- Other Important Files:
  - `terraform/task-definition.json`: ECS task definition template
  - `tests/neo4j_validation.sh`: Neo4j validation tests
  - `.github/workflows/post_deployment_tests.js`: Post-deployment API tests

## Terraform Deployment Process

Our Terraform deployment process has been improved to handle existing, orphaned, or partial resources more effectively. Key features of the updated process include:

1. **Conditional Resource Creation**: The deployment process uses a `use_existing_resources` variable to determine whether to use existing resources or create new ones. This applies to security groups, ACM certificates, SSM parameters, and Neo4j instances.

2. **Terraform State Import**: A script (`import_state.sh`) has been implemented to import existing resources into the Terraform state before applying changes.

3. **Pre-deployment Checks**: A pre-deployment check script (`pre_deployment_check.sh`) runs automatically before each deployment to check for existing resources and run the import script if necessary.

4. **Terraform Workspaces**: A management script (`manage_workspaces.sh`) has been implemented to create and select the appropriate workspace for each environment (development, staging, production).

5. **Cleanup Process**: An optional cleanup step (`cleanup_orphaned_resources.sh`) can be run after successful deployment to identify and remove orphaned resources.

To use these features:

- For automatic deployments (pushes to `stage` or `prod` branches), the `use_existing_resources` flag is set to `true` by default.
- For manual deployments, you can choose whether to use existing resources and whether to run the cleanup process when triggering the workflow through the GitHub Actions interface.
- The pre-deployment checks, workspace management, and state import processes run automatically as part of every deployment.

## Manual Terraform Management

If you need to manage Terraform manually, follow these steps:

1. Navigate to the `terraform` directory.
2. Run `terraform init` to initialize the Terraform working directory.
3. Use the `manage_workspaces.sh` script to select the appropriate workspace for your environment.
4. Review and modify the `main.tf` file if necessary.
5. Run `terraform plan` to see proposed changes.
6. If needed, use the `import_state.sh` script to import existing resources.
7. Run `terraform apply` to create or update the necessary AWS resources.
8. Optionally, run the `cleanup_orphaned_resources.sh` script to clean up any orphaned resources.

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
   - Deployed on AWS EC2 instances (m5.medium)

2. Staging Environment:
   - One instance (combined LedgerSpace and SearchSpace)
   - Deployed on AWS EC2 instance (t3.medium)

3. Development Environment:
   - Up to six instances as needed
   - Deployed on AWS EC2 instances (t3.medium)

Neo4j instances are defined and deployed automatically through the Terraform configuration in `terraform/main.tf` and `terraform/neo4j.tf`.

Key aspects of Neo4j deployment:
- The Neo4j Enterprise license is stored as a GitHub secret (`NEO4J_ENTERPRISE_LICENSE`).
- Deployment workflows retrieve the license and pass it to Terraform.
- Terraform provisions Neo4j instances and applies the license.
- A post-deployment configuration step updates the AWS Systems Manager Parameter Store with the actual Neo4j instance details.

### Neo4j Access Management

The deployment process manages several key components for secure Neo4j access:

1. Neo4j Public Key:
   - Purpose: Used for SSH access to the EC2 instances running Neo4j.
   - Storage: AWS Systems Manager Parameter Store
   - Usage in Terraform: 
     - Retrieved from SSM and used to create an EC2 Key Pair
     - Associated with Neo4j EC2 instances for SSH access
   - Generation and Management:
     - To generate a new SSH key pair, use the following command:
       ```
       ssh-keygen -t rsa -b 2048 -C "neo4j_access_key" -f ./neo4j_key
       ```
     - This will create two files: `neo4j_key` (private key) and `neo4j_key.pub` (public key)
     - Store the content of `neo4j_key.pub` in the AWS Systems Manager Parameter Store
     - Keep the `neo4j_key` file secure and use it for SSH access to the Neo4j instances
     - Update the parameter in AWS SSM whenever you need to rotate the key

2. Neo4j Username and Password:
   - Purpose: Used for authentication to the Neo4j database.
   - Storage: Defined as separate variables for LedgerSpace and SearchSpace in AWS Systems Manager Parameter Store
   - Usage in Terraform: 
     - Retrieved from SSM and used in the EC2 user data script to set up and configure the Neo4j database
     - Separate credentials for LedgerSpace and SearchSpace instances

3. Neo4j Bolt URL:
   - Purpose: Used for connecting to the Neo4j database.
   - Generation: Created during the deployment process, not set in advance
   - Storage: AWS Systems Manager Parameter Store
   - Usage: 
     - Not directly used in EC2 setup
     - Retrieved from SSM for application configuration and database connections
     - No need to store as environment secrets

These components are managed securely through AWS Systems Manager Parameter Store, ensuring they are not exposed in the codebase while still allowing for automated deployment and secure access to Neo4j instances.

## Neo4j License Management

We use a Neo4j Enterprise Startup Edition license with the following limitations:
- Up to 3 Machines for production use (24 Cores / 256 GB RAM each)
- Up to 6 Machines for development
- Up to 3 Machines for non-production internal testing (e.g., staging)

Our current allocation:
- Production: 2 instances (1 LedgerSpace, 1 SearchSpace)
- Staging: 2 instances (1 LedgerSpace, 1 SearchSpace)
- Development: 2 instances (for flexibility in development)

License management process:
1. The license is stored as a secret in GitHub Actions (`NEO4J_ENTERPRISE_LICENSE`).
2. During deployment, the license is retrieved and applied to Neo4j instances.
3. Instance counts and specifications are enforced through Terraform configurations in `terraform/neo4j.tf` and `terraform/variables.tf`.
4. Pre-deployment checks (`terraform/pre_deployment_check.sh`) verify compliance with license limitations.
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

A `null_resource` in `terraform/main.tf` is used to update the AWS Systems Manager parameters with the actual Neo4j instance details after they are created. This step is crucial for managing the Bolt URLs and ensuring that the correct Neo4j connection information is available for the application to use.

The post-deployment configuration process:
1. Retrieves the actual Neo4j instance details (e.g., private IP addresses) from the newly created EC2 instances.
2. Constructs the Neo4j Bolt URLs using these IP addresses.
3. Updates the AWS Systems Manager Parameter Store with the new Bolt URLs.
4. Ensures that the application can access the correct Neo4j connection information for both LedgerSpace and SearchSpace.

This step is crucial for maintaining the correct configuration across deployments and updates, especially for dynamically generated values like Bolt URLs.

## Accessing Neo4j Connection Details in the Application

The application retrieves Neo4j connection details (including Bolt URLs) from AWS Systems Manager Parameter Store. This is configured in the ECS task definition, where the following environment variables are set:

- `NEO_4J_LEDGER_SPACE_BOLT_URL`
- `NEO_4J_LEDGER_SPACE_USER`
- `NEO_4J_LEDGER_SPACE_PASS`
- `NEO_4J_SEARCH_SPACE_BOLT_URL`
- `NEO_4J_SEARCH_SPACE_USER`
- `NEO_4J_SEARCH_SPACE_PASS`

These variables are populated with values from the corresponding SSM parameters, allowing the application to securely access the Neo4j connection details without the need for environment secrets.

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

- In staging and production environments, Bolt URLs are dynamically generated during the deployment process and stored in AWS Systems Manager Parameter Store.
- In development environments, where database creation is not done with Infrastructure as Code (IaC), Bolt URLs are present from the first run.
- The application configuration (`config/config.ts`) handles both scenarios, using the SSM-provided URLs when available and falling back to a default local URL if not provided.
- Importantly, Bolt URLs are not passed as secrets or environment variables in the GitHub Actions workflow. Instead, they are generated and managed entirely within the AWS environment during deployment.

## AWS Credentials and Permissions

- AWS credentials (access key and secret access key) are not stored in the application configuration.
- The necessary AWS permissions are managed through the ECS task role, adhering to the principle of least privilege and enhancing security.
- In the GitHub Actions workflow, AWS credentials are used only for the deployment process and are stored as GitHub secrets.
