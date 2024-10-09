# Infrastructure Management

This document outlines the process of managing the infrastructure for the credex-core application using Terraform and AWS services.

## Automated Deployment and Verification Process

We have implemented an automated process that handles both the deployment and verification of the application. This process includes the following steps:

1. AWS credentials verification
2. Neo4j credentials verification
3. Terraform deployment
4. ECS service stability check
5. API health check

To run the automated deployment and verification process, ensure you're in the project root directory and run:

```bash
npx ts-node terraform/trigger-dev-deploy.ts
```

## Key Files in the Deployment Process

- GitHub Actions Workflows:
  - `.github/workflows/deploy-development.yml`: Workflow for development environment
  - `.github/workflows/deploy-staging.yml`: Workflow for staging environment
  - `.github/workflows/deploy-production.yml`: Workflow for production environment

- Terraform Configuration:
  - `terraform/main.tf`: Main Terraform configuration including Neo4j-related resources
  - `terraform/neo4j.tf`: Specific Terraform configuration for Neo4j instances
  - `terraform/ssm.tf`: AWS Systems Manager configuration

- Other Important Files:
  - `terraform/task-definition.json`: ECS task definition template
  - `tests/neo4j_validation.sh`: Neo4j validation tests
  - `.github/workflows/post_deployment_tests.js`: Post-deployment API tests

## Manual Terraform Management

If you need to manage Terraform manually, follow these steps:

1. Navigate to the `terraform` directory.
2. Run `terraform init` to initialize the Terraform working directory.
3. Review and modify the `main.tf` file if necessary.
4. Run `terraform plan` to see proposed changes.
5. Run `terraform apply` to create or update the necessary AWS resources.

## ECS Task Definition

The ECS task definition is managed using a template file [task-definition.json](../../terraform/task-definition.json). To update the task definition:

1. Modify the `task-definition.json`.
2. Ensure any new environment variables are added to the `environment` section.
3. Update the GitHub Actions workflows to replace placeholders with the corresponding GitHub Secrets.

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

License management process:
1. The license is stored as a secret in GitHub Actions (`NEO4J_ENTERPRISE_LICENSE`).
2. During deployment, the license is retrieved and applied to Neo4j instances.
3. To update the license:
   - Obtain the new license file from Neo4j.
   - Update the `NEO4J_ENTERPRISE_LICENSE` secret in GitHub Environments.
   - Trigger a new deployment to apply the updated license.

For detailed license management procedures, refer to the [Neo4j License Management](./neo4j_license_management.md) document.

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
