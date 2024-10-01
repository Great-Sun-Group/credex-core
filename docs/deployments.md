# Deployment Process

This document outlines the deployment process for the credex-core application, including local development, GitHub Codespaces, staging, and production environments.

## Local Development

For local development and testing, use Docker Compose:

1. Ensure you have Docker and Docker Compose installed on your machine.
2. Create a `.env` file in the project root with the necessary environment variables.
3. Run `docker-compose up` to start the application and its dependencies.

## GitHub Codespaces Development

GitHub Codespaces provides a cloud-based development environment that's preconfigured for the project:

1. Open the project in GitHub Codespaces.
2. The necessary development environment will be automatically set up based on the `.devcontainer` configuration.
3. Use the integrated terminal to run commands and start the application.

### Codespaces-specific considerations:

- Environment variables: Use Codespaces secrets to set up environment variables securely.
- Ports: Codespaces will automatically forward port 5000 as specified in the `devcontainer.json` file.
- Persistence: Changes made in Codespaces persist between sessions, but it's good practice to commit and push changes regularly.

### Running the application in Codespaces:

`npm run dev`

The application should now be running and accessible via the Codespaces URL, which will be automatically generated and displayed in the terminal.

## Configuration

The application uses environment variables for configuration. These are defined in [config](config/config.ts).

## AWS Deployment

The application is deployed to AWS using ECS (Elastic Container Service) with Fargate. The deployment process is automated using GitHub Actions and Terraform. The default AWS region for deployment is set to af-south-1 (Cape Town).

### Prerequisites

1. AWS Account
2. GitHub repository with the credex-core code

### Setting up GitHub Secrets

To securely manage environment variables and secrets, add the following to your GitHub repository secrets:

1. Go to your GitHub repository.
2. Navigate to Settings > Secrets.
3. Add the following secrets for both staging and production environments:
   - `AWS_ACCESS_KEY_ID`: Your AWS Access Key ID
   - `AWS_SECRET_ACCESS_KEY`: Your AWS Secret Access Key
   - `STAGING_NEO4J_LEDGER_SPACE_BOLT_URL` / `PROD_NEO4J_LEDGER_SPACE_BOLT_URL`
   - `STAGING_NEO4J_LEDGER_SPACE_USER` / `PROD_NEO4J_LEDGER_SPACE_USER`
   - `STAGING_NEO4J_LEDGER_SPACE_PASS` / `PROD_NEO4J_LEDGER_SPACE_PASS`
   - `STAGING_NEO4J_SEARCH_SPACE_BOLT_URL` / `PROD_NEO4J_SEARCH_SPACE_BOLT_URL`
   - `STAGING_NEO4J_SEARCH_SPACE_USER` / `PROD_NEO4J_SEARCH_SPACE_USER`
   - `STAGING_NEO4J_SEARCH_SPACE_PASS` / `PROD_NEO4J_SEARCH_SPACE_PASS`
   - `STAGING_OPEN_EXCHANGE_RATES_API_KEY` / `PROD_OPEN_EXCHANGE_RATES_API_KEY`
   - `STAGING_JWT_SECRET` / `PROD_JWT_SECRET`

### ECS Task Definition

The ECS task definition is managed using a template file `task-definition.json` in the project root. This template contains placeholders for environment-specific values, which are replaced during the deployment process.

To update the task definition:

1. Modify the `task-definition.json` file in the project root.
2. Ensure any new environment variables are added to the `environment` section with appropriate placeholders.
3. Update the GitHub Actions workflows (`deploy-staging.yml` and `deploy-production.yml`) to replace new placeholders with the corresponding GitHub Secrets.

The GitHub Actions workflows automatically update the ECS task definition during deployment by:

1. Replacing placeholders in the `task-definition.json` with actual values from GitHub Secrets.
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
4. Update your application's configuration to use these new Neo4j instances.

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
- Ensure all required secrets are correctly set up in GitHub repository secrets.
- Verify that the ECS task definition is correctly updated with the new image and environment variables.
- For local development issues, check the Docker Compose logs and ensure all required environment variables are set in your local .env file.
- For Codespaces issues, check the Codespaces logs and ensure all required environment variables are set in Codespaces secrets.
- For Neo4j issues, check the EC2 instance logs and ensure the `user_data` script executed correctly for each instance.
- For application issues, check the CloudWatch logs for the ECS tasks.

## Security Considerations

- Never commit sensitive information (passwords, API keys, etc.) to the repository.
- Use GitHub Secrets to manage sensitive data for deployments.
- Regularly rotate passwords, API keys, and AWS access keys.
- Ensure that production databases are not accessible from development or staging environments.
- Implement proper access controls and network security in your AWS environment.
- When using Codespaces, be cautious about which ports are publicly accessible.
- Restrict access to Neo4j instances by updating the security group rules in Terraform.
- Ensure that LedgerSpace and SearchSpace instances are properly isolated and secured.

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
