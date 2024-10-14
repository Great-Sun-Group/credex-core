# Deployment Process

This document outlines the deployment process for the credex-core application across development, staging, and production environments.

## Unified Deployment Process

The unified deployment process consists of two main workflows: `create.yml` for initial deployments and `redeploy.yml` for subsequent deployments. Both workflows perform the following steps for all environments:

1. **Environment Detection**:
   - Automatically detects the target environment based on the trigger (branch push or manual input).

2. **Pre-deployment Checks**: 
   - Runs pre-deployment checks to ensure the environment is ready for deployment.

3. **Terraform Workspace Management**:
   - Selects the appropriate Terraform workspace for the target environment.

4. **Terraform Plan and Apply**:
   - Runs `terraform plan` to preview changes.
   - If changes are detected, runs `terraform apply` to apply the changes.

5. **Neo4j Secret Generation and Management**:
   - For initial deployments (`create.yml`):
     - Generates secure, random passwords and usernames for Neo4j databases using the `generate_secrets.sh` script.
     - Creates Bolt URLs based on the newly created EC2 instances.
     - Stores these secrets (usernames, passwords, Bolt URLs, and JWT secret) as GitHub Secrets for the specific environment.
     - Outputs these secrets once for secure manual storage to prevent loss.
   - For subsequent deployments (`redeploy.yml`):
     - Retrieves these secrets from GitHub Secrets for the specific environment.

6. **Application Deployment**:
   - Updates the ECS task definition with the Neo4j connection details and other secrets from GitHub Secrets.
   - Deploys the application using the updated task definition.

7. **Post-Deployment Tests**:
   - Runs post-deployment tests to verify the application's functionality and its connection to Neo4j databases.

8. **Deployment Logging**:
   - Logs the deployment details for future reference.

## Handling of Secrets and Configuration

- The following secrets are generated during the initial deployment and stored as GitHub Secrets for each environment:
  - NEO_4J_LEDGER_SPACE_USER
  - NEO_4J_LEDGER_SPACE_PASS
  - NEO_4J_LEDGER_SPACE_BOLT_URL
  - NEO_4J_SEARCH_SPACE_USER
  - NEO_4J_SEARCH_SPACE_PASS
  - NEO_4J_SEARCH_SPACE_BOLT_URL
  - JWT_SECRET
- These secrets are specific to each environment (development, staging, production).
- For subsequent deployments, these secrets are retrieved from GitHub Secrets and used in the ECS task definition.
- The following secrets are manually set for each environment:
  - AWS_ACCESS_KEY
  - AWS_SECRET_ACCESS_KEY
  - NEO4J_ENTERPRISE_LICENSE
  - OPEN_EXCHANGE_RATES_API
- The AWS_REGION is now hardcoded in the `terraform/variables.tf` file.
- The domain name is now constructed using the hardcoded variables in `terraform/variables.tf`.
- All secrets are never exposed in logs or code repositories.

## Hardcoded Variables

The following variables are hardcoded in the `terraform/variables.tf` file:

- AWS_REGION: "af-south-1"
- DOMAIN_BASE: "mycredex.app"
- SUBDOMAIN_DEVELOPMENT: "dev.api"
- SUBDOMAIN_STAGING: "stage.api"
- SUBDOMAIN_PRODUCTION: "api"

These variables are used to construct the domain names for each environment:
- Development: dev.api.mycredex.app
- Staging: stage.api.mycredex.app
- Production: api.mycredex.app

## Post-Deployment Verification

After each deployment, it's crucial to verify that the application is functioning correctly:

1. Check the GitHub Actions logs for any deployment errors.
2. Verify that the ECS tasks are running correctly in the AWS console.
3. Access the application and perform basic functionality tests.
4. Verify the application's connection to both LedgerSpace and SearchSpace Neo4j databases.
5. Monitor the application logs for any unexpected errors.
6. Review the Terraform output for any unexpected changes or warnings.
7. Confirm that the correct domain name is being used for the deployed environment, based on the hardcoded variables.

## Redeployment Process

The redeployment process (`redeploy.yml`) is similar to the initial deployment but with a few key differences:

1. It does not generate new secrets but uses the existing ones stored in GitHub Secrets.
2. It checks for existing resources and imports them into the Terraform state if necessary.
3. It updates the existing ECS task definition and service instead of creating new ones.

This process ensures that subsequent deployments maintain the same database connections and secrets while allowing for application code updates and infrastructure changes as needed.
