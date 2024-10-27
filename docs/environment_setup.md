# Environment Setup

This document outlines environment configuration for developers working on the credex-core API and/or client apps, and additional configuration required for developers working on the deployment infrastructure and managing the CI/CD pipeline.

# Dev Env Setup for API and Client Apps
Configuration for your local or codespaces development environment.

## Prerequisites

- GitHub account with access to this repository.

### Addnl Prereq for Local Dev

- Git
- Docker and Docker Compose
- Visual Studio Code
- Visual Studio Code Remote - Containers extension
- Node.js and npm

## Environment Setup

### Local Development

1. Clone the repository:

   ```
   git clone https://github.com/Great-Sun-Group/credex-core.git
   cd credex-core
   ```

2. Create a `.env` file in the root of the project based on `.env.example` and fill in the required environment variables (see below).
3. `git checkout -b new-branch-name` to start local development

#### Using Devcontainers with VS Code

Devcontainers provide a consistent, reproducible development environment across different machines. This project is set up to use devcontainers, which encapsulate the development environment in a Docker container.

To use devcontainers:

1. Ensure you have the "Remote - Containers" extension installed in VS Code.
2. Open the project folder in VS Code.
3. When prompted, click "Reopen in Container" or use the command palette (F1) and select "Remote-Containers: Reopen in Container".
4. VS Code will build the devcontainer (this may take a few minutes the first time) and open the project inside the container.

### GitHub Codespaces

1. Go to your personal GitHub Settings -> Codespaces and Add New Secret for each secret listed below, giving it access to the credex-core repository.
2. Go to the main page of the credex-core repository (dev branch), and create a new branch from dev, or from the branch of the project you are contributing to.
3. Within the new branch, click on the "Code" button, select the "Codespaces" tab, and click "Create codespace on new-branch-name".
4. The Codespace will automatically set up the environment within the devcontainer.

### Benefits of Devcontainers

- Consistent development environment across team members and hardware
- Easy onboarding for new developers
- Isolation from the host system 
- Pre-configured development tools and extensions

Locally, you can use VS Code's "Attach to Running Container" feature to work within the Docker container, or use `docker exec` to access the container's shell.

## Environment Variables

**NEO_4J_LEDGER_SPACE_BOLT_URL**\
**NEO_4J_LEDGER_SPACE_PASS**\
**NEO_4J_LEDGER_SPACE_USER**\
**NEO_4J_SEARCH_SPACE_BOLT_URL**\
**NEO_4J_SEARCH_SPACE_PASS**\
**NEO_4J_SEARCH_SPACE_USER**
- To set up Neo4j Aura databases:
  1.  Go to https://neo4j.com/cloud/aura/ and sign up for two separate accounts using different email addresses.
  2.  For each account, create a new database instance. One should be name ledgerSpace and the other searchSpace.
  3.  Once the databases are created, you'll be provided with connection details.
  4.  Use the Bolt URL, username, and password for each database to fill in the corresponding environment variables.
- The LEDGER_SPACE variables correspond to one database, and the SEARCH_SPACE variables to the other.

**OPEN_EXCHANGE_RATES_API**
- To get this secret from Open Exchange Rates:
  1.  Go to https://openexchangerates.org/ and sign up for an account.
  2.  Once logged in, navigate to your account dashboard.
  3.  Look for your App ID or API Key.
  4.  Copy this key and use it as the value for OPEN_EXCHANGE_RATES_API.

**JWT_SECRET**\
**CLIENT_API_KEY**
- create your own unique random strings

For development environments, the `NODE_ENV` variable defaults to 'development'.

# Deployed Environments

Our infrastructure supports two distinct types of environments:

1. Development Pipeline Environments (dev/stage/prod)
2. Model Environments (for research and forecasting)

## Development Pipeline Environments

These environments form our development and deployment pipeline, progressing from development through staging to production. They are designed for application development, testing, and production deployment.

### Environment Types

1. **Development Environment**
   - Subdomain: dev.mycredex.app
   - Purpose: Active development and initial testing
   - Branch: 'dev' or any branch with a name including the pattern "deploy"
   - Configuration:
     - NODE_ENV: development
     - LOG_LEVEL: debug
     - Smaller instance sizes for cost efficiency

2. **Staging Environment**
   - Subdomain: stage.mycredex.app
   - Purpose: Pre-production testing and validation
   - Branch: 'stage'
   - Configuration:
     - NODE_ENV: staging
     - LOG_LEVEL: debug
     - Production-like instance sizes

3. **Production Environment**
   - Domain: mycredex.app
   - Purpose: Live production environment
   - Branch: 'prod'
   - Configuration:
     - NODE_ENV: production
     - LOG_LEVEL: info
     - Full-size production instances

### Infrastructure Configuration

Each environment is deployed with:
- Dedicated VPC with proper networking
- ECS Fargate for application hosting
- Neo4j Enterprise instances for data storage
- Health monitoring and automated recovery
- Proper security groups and access controls

## Model Environments

Model environments are specialized deployments designed for economic research and forecasting. They are separate from the development pipeline and configured specifically for data analysis and modeling purposes.

### Purpose
- Economic modeling and simulation
- Research deployments
- Data analysis and forecasting
- Testing economic theories and scenarios

### Example: model_001 Environment
- Subdomain: model-001.mycredex.app
- Configured for research workloads
- Isolated from production data
- Specialized instance types for analytical workloads
- Custom security groups for research access (might not be implemented yet?)

See [Adding Research and Modeling Deployments](#adding-research-and-modeling-deployments)

## Prerequisites for Deployment

### Domain and AWS Setup
- Domain: mycredex.app and mycredex.dev registered with third-party provider
- Route 53 configured with hosted zones
- Neo4j Enterprise License required

### IAM Configuration
Manually configured IAM setup with:

1. IAM Users:
   - credex-core-development-deployment
   - credex-core-staging-deployment
   - credex-core-production-deployment
   - credex-core-model_001-deployment

2. IAM Group:
   - `credex-core-deployment`: Group that includes all users above

3. IAM Policy:
   - `credex-core-permissions`: Policy that defines the permissions needed for deployment

The `credex-core-permissions` policy is attached to the `credex-core-deployment` group, granting necessary permissions to all deployment users. While stored and implemented in AWS, and manually updated through the console, we keep a local copy of this policy up to date at [credex-permissions.json](deployment/credex-permissions.json).

**When Terraform scripts are modified, the IAM policy may need to be updated.** This is uncommon, but must be kept in mind.

### Secrets
Each of the IAM users above requires an access key, which is entered in a Github Environment, along with the Neo4J License referenced above:\
\
**AWS_ACCESS_KEY**\
**AWS_SECRET_ACCESS_KEY**\
**NEO4J_ENTERPRISE_LICENSE**

## Github direct to AWS
The Github Actions (Workflows) manage an S3 bucket and DynamoDB table that stores a terraform state for every deployed environment.

## Terraform
Our terraform codebase inserts DNS records into Route 53 for each subdomain, which links it to an environment that is deployed and managed by the codebase.

## Summary of Deployment Architecture
The `dev` branch (which is our default/main branch on Github) and any branch starting with "deploy" can be deployed to the `development` environment, and is linked to the `dev.api.mycredex.app` subdomain, with `NODE_ENV` set to `development` and LOG_LEVEL set to `debug`.

The `stage` branch is deployed to the `staging` environment, linked to the `stage.api.mycredex.app` subdomain, with `NODE_ENV` set to `staging` and LOG_LEVEL set to `debug`.

The `prod` branch is deployed to the `production` environment, linked to the `api.mycredex.app` subdomain, with `NODE_ENV` set to `production` and LOG_LEVEL set to `info`.

See [Adding Research and Modeling Deployments](#adding-research-and-modeling-deployments)

## App Deployment Secrets
Once the connectors and databases have been deployed, the database secrets output by the latter must be entered into it's respective Github Environment, along with the additional secrets below.

**NEO_4J_LEDGER_SPACE_BOLT_URL**\
**NEO_4J_LEDGER_SPACE_PASS**\
**NEO_4J_LEDGER_SPACE_USER**\
**NEO_4J_SEARCH_SPACE_BOLT_URL**\
**NEO_4J_SEARCH_SPACE_PASS**\
**NEO_4J_SEARCH_SPACE_USER**\
outputs from `databases.yml` workflow

**OPEN_EXCHANGE_RATES_API**\
separate key for `prod`, other deployments on a single key.

**JWT_SECRET**\
**CLIENT_API_KEY**\
unique random strings

### Adding Research and Modeling Deployments

To add a new research/modeling environment, several files need to be updated:

1. **Terraform Environment File**
   Create a new file in `/terraform/environments/` based on `model_001.tf`

2. **Update locals.tf**
   Add the new environment to the env_config map in [terraform/locals.tf](../terraform/locals.tf)

3. **Update variables.tf**
   Add the new environment to the validation in [terraform/variables.tf](../terraform/variables.tf)

4. **GitHub Workflows**
   Update the environment matrix in:
   - `.github/workflows/connectors.yml`
   - `.github/workflows/databases.yml`
   - `.github/workflows/app.yml`

   Add the new environment to the matrix:
   ```yaml
   strategy:
     matrix:
       environment: [development, staging, production, model_001, model_002]
   ```

5. **IAM Setup**
   - Create a new IAM user: `credex-core-model_002-deployment`
   - Add user to the `credex-core-deployment` group
   - Generate access keys and add to GitHub Environment secrets

6. **GitHub Environment**
   Create a new environment in GitHub repository settings:
   - Name: model_002
   - Add required secrets:
     - AWS_ACCESS_KEY
     - AWS_SECRET_ACCESS_KEY
     - NEO4J_ENTERPRISE_LICENSE
     - (Other secrets after database deployment etc)

7. **DNS Configuration**
   The terraform code will automatically:
   - Create necessary DNS records in Route 53
   - Link subdomain (model-002.mycredex.dev) to the environment

Remember to:
- Use unique CIDR ranges for each environment
- Configure instance sizes appropriate for research workloads
- Consider data isolation requirements
- Update documentation to reflect new environment
