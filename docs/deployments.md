# Deployment Process

This document outlines the deployment process for the credex-core application, including local development, GitHub Codespaces, staging, and production environments.

## Prerequisites

### For all environments:
- GitHub account with access to Great Sun Group repositories

### Additional prerequisites for local development:
- Git
- Docker and Docker Compose
- Visual Studio Code

## Environment Variables and Secrets

The following secrets are required for local development and Codespaces. These should be set in your personal Codespace secrets or in a `.env` file in the root directory when running locally.

- DJANGO_SECRET
  - Create your own unique random string

- JWT_SECRET
  - Create your own unique random string
  
- NEO_4J_LEDGER_SPACE_BOLT_URL
- NEO_4J_LEDGER_SPACE_PASS
- NEO_4J_LEDGER_SPACE_USER
- NEO_4J_SEARCH_SPACE_BOLT_URL
- NEO_4J_SEARCH_SPACE_PASS
- NEO_4J_SEARCH_SPACE_USER
  - To set up Neo4j Aura databases:
    1. Go to https://neo4j.com/cloud/aura/ and sign up for two separate accounts using different email addresses.
    2. For each account, create a new database instance. One should be named ledgerSpace and the other searchSpace.
    3. Once the databases are created, you'll be provided with connection details.
    4. Use the Bolt URL, username, and password for each database to fill in the corresponding environment variables.
    5. The LEDGER_SPACE variables correspond to one database, and the SEARCH_SPACE variables to the other.

- OPEN_EXCHANGE_RATES_API
  - To get this secret from Open Exchange Rates:
    1. Go to https://openexchangerates.org/ and sign up for an account.
    2. Once logged in, navigate to your account dashboard.
    3. Look for your App ID or API Key.
    4. Copy this key and use it as the value for OPEN_EXCHANGE_RATES_API.

- WHATSAPP_BOT_API_KEY
  - Create your own unique random string

Refer to the `.env.example` file in the root directory for a template of these environment variables. Remember to never commit your actual `.env` file with real values to version control.

## Local Development

For local development and testing:

1. Clone the repository:
   ```
   git clone https://github.com/Great-Sun-Group/greatsun-dev.git
   cd greatsun-dev
   ```

2. Create a `.env` file in the root of the project based on `.env.example` and fill in the required environment variables.

3. Build and start the development container:
   ```
   docker-compose up -d --build
   ```

4. Attach VS Code to the running container or use `docker exec` to access the container's shell.

## GitHub Codespaces Development

GitHub Codespaces provides a cloud-based development environment that's preconfigured for the project:

1. Set up GitHub Secrets:
   - Go to your personal GitHub Settings -> Codespaces and Add New Secret for each environment variable, giving it access to the greatsun-dev repository.

2. Create a new Codespace:
   - Go to the main page of the greatsun-dev repository (dev branch), and create a new branch from dev.
   - In the new branch, click on the "Code" button
   - Select the "Codespaces" tab
   - Click "Create codespace on new-branch-name"

3. The Codespace will automatically set up the environment.

4. Use the integrated terminal to run commands and start the application:
   ```
   npm run dev
   ```

The application should now be running and accessible via the Codespaces URL, which will be automatically generated and displayed in the terminal.

## Configuration

The application uses environment variables for configuration. These are defined in [config](config/config.ts).

## AWS Deployment

The application is deployed to AWS using ECS (Elastic Container Service) with Fargate. The deployment process is automated using GitHub Actions and Terraform. The default AWS region for deployment is set to af-south-1 (Cape Town).

### Prerequisites

1. AWS Account
2. GitHub repository with the credex-core code

### Setting up GitHub Secrets for AWS Deployment

To securely manage environment variables and secrets for AWS deployment, add the following to your GitHub repository secrets:

1. Go to your GitHub repository.
2. Navigate to Settings > Secrets.
3. Add the following secrets:
   - `AWS_ACCESS_KEY_ID`: Your AWS Access Key ID
   - `AWS_SECRET_ACCESS_KEY`: Your AWS Secret Access Key

### AWS Secrets Manager

For staging and production environments, we use AWS Secrets Manager to securely store and manage sensitive information. This includes database credentials and API keys.

#### Setting up AWS Secrets Manager

1. In the AWS Console, navigate to AWS Secrets Manager.
2. Create two new secrets:
   - `neo4j_prod_secrets` for production environment
   - `neo4j_stage_secrets` for staging environment
3. Each secret should contain the following key-value pairs:
   - `ledgerspacebolturl`: Neo4j LedgerSpace Bolt URL
   - `ledgerspaceuser`: Neo4j LedgerSpace username
   - `ledgerspacepass`: Neo4j LedgerSpace password
   - `searchspacebolturl`: Neo4j SearchSpace Bolt URL
   - `searchspaceuser`: Neo4j SearchSpace username
   - `searchspacepass`: Neo4j SearchSpace password

#### Accessing Secrets in the Application

The application is configured to retrieve these secrets at runtime in the staging and production environments. The `config/config.ts` file handles the logic for fetching secrets from AWS Secrets Manager when the environment is set to 'staging' or 'production'.

For local development and Codespaces, the application will continue to use environment variables as described in the earlier sections.

### ECS Task Definition

The ECS task definition is managed using a template file `task-definition.json` in the project root. This template contains placeholders for environment-specific values, which are replaced during the deployment process.

To update the task definition:

1. Modify the `task-definition.json` file in the project root.
2. Ensure any new environment variables are added to the `environment` section with appropriate placeholders.
3. Update the GitHub Actions workflows (`deploy-staging.yml` and `deploy-production.yml`) to replace new placeholders with the corresponding GitHub Secrets or AWS Secrets Manager references.

The GitHub Actions workflows automatically update the ECS task definition during deployment by:

1. Replacing placeholders in the `task-definition.json` with actual values from GitHub Secrets or references to AWS Secrets Manager.
2. Using the AWS CLI to register the new task definition.
3. Updating the ECS service to use the new task definition.

### ECS Service Configuration

The ECS service is configured using Terraform in the `main.tf` file. Key aspects of the configuration include:

- Service name: "credex-core-service"
- Cluster: Uses the "credex-cluster" ECS cluster
- Launch type: FARGATE
- Desired count: 1 (can be adjusted based on load requirements)
- Network configuration: 
  - Uses specified subnets
  - Assigns a public IP
  - Uses a dedicated security group for ECS tasks

The security group for ECS tasks allows inbound traffic on port 5000 and all outbound traffic.

### Deployment Process

1. Staging Deployment:
   - Push changes to the `stage` branch.
   - The `deploy-staging.yml` GitHub Actions workflow will automatically:
     - Build the Docker image
     - Push the image to ECR
     - Update the ECS task definition
     - Deploy to the staging ECS cluster

2. Production Deployment:
   - Push changes to the `prod` branch.
   - The `deploy-production.yml` GitHub Actions workflow will automatically:
     - Build the Docker image
     - Push the image to ECR
     - Update the ECS task definition
     - Deploy to the production ECS cluster

3. Post-Deployment Verification:
   - Currently, there is a placeholder for post-deployment verification in the GitHub Actions workflows.
   - This step can be expanded to include more comprehensive checks, such as:
     - Health check endpoints
     - Integration tests
     - Performance benchmarks

4. Monitoring Deployments:
   - Check GitHub Actions logs for deployment status.
   - Use AWS Console or CLI to monitor ECS services and tasks.

## Neo4j Deployment

The project uses Neo4j for both staging and production environments. The deployment and management of Neo4j instances are handled through Terraform.

### Neo4j Instances

1. Production Environment:
   - Uses Neo4j Enterprise Edition
   - Two separate instances: LedgerSpace and SearchSpace
   - Deployed on AWS EC2 instances (m5.large)
   - Managed through Terraform

2. Staging Environment:
   - Uses Neo4j Community Edition
   - Two separate instances: LedgerSpace and SearchSpace
   - Deployed on AWS EC2 instances (t3.medium)
   - Managed through Terraform

### Deployment Process

1. The Neo4j instances are defined in the `terraform/main.tf` file.
2. To deploy or update the Neo4j instances:
   - Navigate to the `terraform` directory
   - Run `terraform init` (if not done before)
   - Run `terraform plan` to review the changes
   - Run `terraform apply` to apply the changes
3. After applying the Terraform changes, you'll receive the public IPs for all four Neo4j instances.
4. Update the AWS Secrets Manager secrets (`neo4j_prod_secrets` and `neo4j_stage_secrets`) with the new Neo4j instance details.

Remember to secure your Neo4j instances by updating the security group rules in the Terraform configuration to restrict access only to necessary IP ranges or security groups.

This setup provides a scalable and manageable solution for running separate LedgerSpace and SearchSpace Neo4j instances in both staging (Community Edition) and production (Enterprise Edition) environments, fully integrated with your existing AWS infrastructure.

### Configuration

- The Neo4j instances are configured using the `user_data` script in the EC2 instance definitions.
- Ensure that the appropriate Neo4j version and configuration are set in the `user_data` scripts.
- Update the security groups in `terraform/main.tf` to restrict access to the Neo4j instances as needed.

### Connecting to Neo4j Instances

- The public IPs of the Neo4j instances are output after Terraform apply.
- Use these IPs to connect to the Neo4j instances:
  - Browser interface: `http://<instance-ip>:7474`
  - Bolt protocol: `bolt://<instance-ip>:7687`

### Maintenance

- Regularly update the Neo4j versions in the `user_data` scripts.
- Monitor the EC2 instances for performance and adjust instance types if necessary.
- Implement regular backups of the Neo4j data for both LedgerSpace and SearchSpace instances.

## Terraform Setup

1. Install Terraform on your local machine.
2. Navigate to the `terraform` directory.
3. Run `terraform init` to initialize the Terraform working directory.
4. Run `terraform apply` to create the necessary AWS resources.

Note: The default AWS region is set to af-south-1 (Cape Town) in the Terraform configuration. If you need to deploy to a different region, you'll need to modify the `aws_region` variable in the `terraform/main.tf` file.

## Monitoring and Logging

The application uses AWS CloudWatch for monitoring and logging. This is configured in the ECS task definition within the Terraform configuration.

### CloudWatch Logs

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

## Troubleshooting

- If deployments fail, check the GitHub Actions logs for error messages.
- Ensure all required secrets are correctly set up in GitHub repository secrets and AWS Secrets Manager.
- Verify that the ECS task definition is correctly updated with the new image and environment variables.
- For local development issues, check the Docker Compose logs and ensure all required environment variables are set in your local .env file.
- For Codespaces issues, check the Codespaces logs and ensure all required environment variables are set in Codespaces secrets.
- For Neo4j issues, check the EC2 instance logs and ensure the `user_data` script executed correctly for each instance.
- For application issues, check the CloudWatch logs for the ECS tasks.
- If there are issues with secrets retrieval, check the IAM roles and policies to ensure the ECS tasks have the necessary permissions to access AWS Secrets Manager.

## Security Considerations

- Never commit sensitive information (passwords, API keys, etc.) to the repository.
- Use GitHub Secrets to manage deployment-related sensitive data and Codespaces environment variables.
- Use AWS Secrets Manager to store and manage application secrets for staging and production environments.
- Use `.env` files for local development, but ensure they are listed in `.gitignore` to prevent accidental commits.
- Regularly rotate passwords, API keys, and AWS access keys.
- Ensure that production databases are not accessible from development or staging environments.
- Implement proper access controls and network security in your AWS environment.
- When using Codespaces, be cautious about which ports are publicly accessible.
- Restrict access to Neo4j instances by updating the security group rules in Terraform.
- Ensure that LedgerSpace and SearchSpace instances are properly isolated and secured.
- Implement least privilege access for IAM roles used by ECS tasks to access AWS Secrets Manager.

## Continuous Improvement

The deployment process is designed to be flexible and scalable. As the project evolves, consider:
- Implementing comprehensive post-deployment verification steps, including automated tests and health checks
- Adding more comprehensive testing in the CI/CD pipeline
- Implementing blue-green deployments for zero-downtime updates
- Setting up automated rollback procedures in case of failed deployments
- Enhancing monitoring and alerting for the deployed application and Neo4j instances
- Optimizing Codespaces configuration for faster startup and development experience
- Implementing automated backups for all Neo4j instances (LedgerSpace and SearchSpace)
- Setting up Neo4j clustering for high availability in the production environment for both LedgerSpace and SearchSpace
- Implementing data synchronization or replication strategies between LedgerSpace and SearchSpace if required
- Implementing a secrets rotation policy for AWS Secrets Manager to automatically update and distribute new credentials
- Setting up monitoring and alerting for AWS Secrets Manager access and usage
