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

- Environment variables: Use Codespaces secrets to set up environment variables securely. Set .
- Ports: Codespaces will automatically forward port 5000 as specified in the `devcontainer.json` file.
- Persistence: Changes made in Codespaces persist between sessions, but it's good practice to commit and push changes regularly.

### Running the application in Codespaces:

`npm run dev`

The application should now be running and accessible via the Codespaces URL, which will be automatically generated and displayed in the terminal.

## Configuration

The application uses environment variables for configuration. These are defined in `config/config.js` and include:

- `NODE_ENV`: The current environment (development, staging, production)
- `PORT`: The port on which the server listens
- `LOG_LEVEL`: The logging level
- Database connection details for Neo4j Ledger and Search spaces
- API keys and secrets

## AWS Deployment

The application is deployed to AWS using ECS (Elastic Container Service) with Fargate. The deployment process is automated using GitHub Actions and Terraform.

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

### Deployment Process

1. Staging Deployment:
   - Push changes to the `stage` branch.
   - GitHub Actions will automatically build, push to ECR, update the task definition, and deploy to the staging ECS cluster.

2. Production Deployment:
   - Push changes to the `prod` branch.
   - GitHub Actions will automatically build, push to ECR, update the task definition, and deploy to the production ECS cluster.

3. Monitoring Deployments:
   - Check GitHub Actions logs for deployment status.
   - Use AWS Console or CLI to monitor ECS services and tasks.

## Terraform Setup

1. Install Terraform on your local machine.
2. Navigate to the `terraform` directory.
3. Run `terraform init` to initialize the Terraform working directory.
4. Run `terraform apply` to create the necessary AWS resources.

## Troubleshooting

- If deployments fail, check the GitHub Actions logs for error messages.
- Ensure all required secrets are correctly set up in GitHub repository secrets.
- Verify that the ECS task definition is correctly updated with the new image and environment variables.
- For local development issues, check the Docker Compose logs and ensure all required environment variables are set in your local .env file.
- For Codespaces issues, check the Codespaces logs and ensure all required environment variables are set in Codespaces secrets.

## Security Considerations

- Never commit sensitive information (passwords, API keys, etc.) to the repository.
- Use GitHub Secrets to manage sensitive data for deployments.
- Regularly rotate passwords, API keys, and AWS access keys.
- Ensure that production databases are not accessible from development or staging environments.
- Implement proper access controls and network security in your AWS environment.
- When using Codespaces, be cautious about which ports are publicly accessible.

## Continuous Improvement

The deployment process is designed to be flexible and scalable. As the project evolves, consider:
- Adding more comprehensive testing in the CI/CD pipeline
- Implementing blue-green deployments for zero-downtime updates
- Setting up automated rollback procedures in case of failed deployments
- Enhancing monitoring and alerting for the deployed application
- Optimizing Codespaces configuration for faster startup and development experience
