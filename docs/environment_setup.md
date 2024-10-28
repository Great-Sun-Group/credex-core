# Environment Setup

This document outlines environment configuration for developers working on the credex-core API and/or client apps, and additional configuration required for developers working on the deployment infrastructure and managing the CI/CD pipeline ([jump](#deployed-environments-setup)).

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

## Dev Env Setup

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

# Deployed Environments Setup

These environment configurations are required for work on the application deployment process or the infrastructure that undergirds the application (connectors and databases), and for the daily management of the portion of the CI/CD pipeline that occurs in deployed `development` and `staging` environments for final approval to deploy to the`production` environment that provides members access to the credex ecosystem.

## Prerequisites

Our Infrastructure as Code implementation of Terraform manages the majority of our infrastructure and application deployment processes. However, for this codebase to function properly it requires the manual registration and configuration of certain elements.


### Top Level Authorization
Top level authorization is managed by Ryan Watson. In his personal accounts are:
- Domains `mycredex.app` and `mycredex.dev` are registered at [Hover.com](https://www.hover.com/), with nameservers pointed to Route 53 at AWS.
- A master AWS root login has been created under hq@greatsunfinancial.ca, an email address managed by a Google Workspace with primary domain ryanlukewatson.com. 2FA is implemented for the root login, linked to Ryan's phone. Root users have been set for AWS accounts associated with each domain, isolating the production environment to it's own AWS account and domain, which also has manual IAM configuration as below.

In case of Ryan's incapacitation, contact sister Hayley Watson for root access.

### Neo4j License
Great Sun Financial Inc. has received a Neo4j Startup License, whose value is required as a secret below. A single value is currently used across all environments, but an environment can be configured under a different license by updating its individual secret.

### AWS Manual Configuration
Within the root account above, a `production` AWS account has been set up to manage the production deployment to mycredex.app, a `development` AWS account has been set up with identical configuration as below to manage the development and modeling deployments to mycredex.dev. Each environment has been manually configured by logging into the console as the root of the respective AWS account.

#### Region
We deploy to `af-south-1`, which must be activated in an AWS account.

#### Route 53
Route 53 is manually configured with a hosted zone that manages traffic at the highest level of doman and subdomain.

#### IAM
To manage access to AWS resources for deployment, we have manually created the following IAM setup:

1. a. IAM Users in `production`:
   - `credex-core-production-deployment`: User for production deployments

   b. IAM Users in `development`:
   - `credex-core-development-deployment`: User for development deployments
   - `credex-core-staging-deployment`: User for staging deployments
   - `credex-core-model_01-deployment`: User required for each model environment deployment

2. IAM Group (both accounts):
   - `credex-core-deployment`: Group that includes all deployment users

3. IAM Policy (both accounts):
   - `credex-core-permissions`: Policy that defines the permissions needed for deployment

The `credex-core-permissions` policy is attached to the `credex-core-deployment`, granting necessary permissions to all deployment users. While stored and implemented in AWS in both accounts and manually updated through the console, we keep a local copy of this policy up to date at [credex-permissions.json](deployment/credex-permissions.json), which the policy in each account should match.

**When Terraform scripts are modified, both the IAM policies may need to be updated.** This is uncommon, but must be kept in mind.

### Secrets and Github Environment Setup
Each of the IAM users above has generated an access key, which has been entered in a Github Environment, along with the Neo4J License referenced above:\
\
**AWS_ACCESS_KEY**\
**AWS_SECRET_ACCESS_KEY**\
**NEO4J_ENTERPRISE_LICENSE**

## Infrastructure as Code
From this point the credex-core api can be deployed into any environment and made securely available on the public internet at api.mycredex.app or chosen_env_prefix.api.mycredex.dev. The process requires the injection of database and other secrets into the GitHub Environment prior to app deployment.

### Github direct to AWS
The Github Actions (Workflows) manage an S3 bucket and DynamoDB table that stores a terraform state for every deployed environment.

### Terraform
Our terraform codebase inserts DNS records into Route 53 for each subdomain, which links it to an environment that is deployed and managed by the codebase.

## Summary of Deployment Architecture
The `dev` branch (which is our default/main branch on Github) and any branch starting with "deploy" can be deployed to the `development` environment, and is linked to the `dev.api.mycredex.dev` subdomain, with `NODE_ENV` set to `development` and LOG_LEVEL set to `debug`.

The `stage` branch is deployed to the `staging` environment, linked to the `stage.api.mycredex.dev` subdomain, with `NODE_ENV` set to `staging` and LOG_LEVEL set to `info`.

Branches can be configured to deploy to research environments with unique environment names such as `model_001`, which would be linked to the `model_001.api.mycredex.dev` subdomain, with `NODE_ENV` set to `staging` and LOG_LEVEL set to `info`.

The `prod` branch is deployed to the `production` environment, linked to the `api.mycredex.app` subdomain, with `NODE_ENV` set to `production` and LOG_LEVEL set to `info`.

## Deployment Process
When a branch is ready to be deployed, with appropriate Github Environment, permissions, etc:

### 1. Run the Github Action `Deploy Connectors`
Deploys the core infrastructure including DNS records, load balancers, security groups, etc

### 2. Run the Github Action `Deploy Databases`
Deploys ledgerSpace and searchSpace neo4j databases. Currently skipped, and cloud-based Neo4j Aura is being used.

### 3. Enter Application Secrets
Once the connectors and databases have been deployed, the database secrets output by the latter must be entered into it's respective Github Environment, along with the additional secrets below.

**NEO_4J_LEDGER_SPACE_BOLT_URL**\
**NEO_4J_LEDGER_SPACE_PASS**\
**NEO_4J_LEDGER_SPACE_USER**\
**NEO_4J_SEARCH_SPACE_BOLT_URL**\
**NEO_4J_SEARCH_SPACE_PASS**\
**NEO_4J_SEARCH_SPACE_USER**\
outputs from `databases.yml` workflow

**OPEN_EXCHANGE_RATES_API**\
single paid account with separate keys for `prod`, `stage` and `dev`.

**JWT_SECRET**\
**CLIENT_API_KEY**\
unique random strings

### 4. Run the Github Action `Deploy App`
Builds and deploys the application image.

# Full Environment Setup Complete
This completes the steps to deploy credex-core to production, staging, development, and model environments.
