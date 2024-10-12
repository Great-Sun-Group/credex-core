# Environment Setup

This document outlines the setup process for development, staging, and production environments for the credex-core application.

## Prerequisites

Deployers require these secrets to be set in their env for the Development Deployment Github App:

- `GH_APP_ID`
- `GH_INSTALLATION_ID`
- `GH_APP_PRIVATE_KEY`

## Environment Setup Process

All environments (Development, Staging, and Production) are managed through AWS ECS and deployed via GitHub Actions. The initial setup process is as follows:

1. Set up GitHub Apps and Environments for deployment.
2. Set up Terraform (detailed in the Infrastructure Management section).
3. Configure AWS credentials in your local environment.

## Environment Variables

The `NODE_ENV` variable is set during the deployment process:

- For development deployments, it's set to 'development' by default
- For staging deployments, it's set to 'staging'
- For production deployments, it's set to 'production'

The following environment variables must be set in Github Environment and imported by the Github App for the deployment to succeed:

- `AWS_ACCESS_KEY`
- `AWS_SECRET_ACCESS_KEY`
- `NEO_4J_LEDGER_SPACE_USER`
- `NEO_4J_LEDGER_SPACE_PASS`
- `NEO_4J_SEARCH_SPACE_USER`
- `NEO_4J_SEARCH_SPACE_PASS`
- `OPEN_EXCHANGE_RATES_API`
- `JWT_SECRET`

The following environment variables are optional, because on first deployment they do not exist. First deployment provides the values, which then must be set in their respective environment. Subsequent deployments that redeploy neo4j (exercise caution with this! docs to be created) will provide new Bolt URLs, which must be updated in the respective environment.

- `NEO_4J_LEDGER_SPACE_BOLT_URL`
- `NEO_4J_SEARCH_SPACE_BOLT_URL`

## IAM Users, Groups, and Policies

To manage access to AWS resources for deployment, we use the following IAM setup:

1. IAM Users:
   - `credex-core-development-deployment`: User for development deployments
   - `credex-core-staging-deployment`: User for staging deployments
   - `credex-core-production-deployment`: User for production deployments

2. IAM Group:
   - `credex-core-deployment`: Group that includes all deployment users

3. IAM Policy:
   - `credex-core-permissions`: Policy that defines the permissions needed for deployment

The `credex-core-permissions` policy is attached to the `credex-core-deployment` group, granting necessary permissions to all deployment users. While stored and implemented in AWS, and updated through the console, we keep a local copy of this policy up to date at [credex-permissions.json](credex-permissions.json).

### Updating IAM Policy

When Terraform scripts are modified, the IAM policy may need to be updated. Follow these steps:

1. Review changes made to the Terraform scripts, particularly in `main.tf`.
2. Identify any new AWS resources or actions being used.
3. Update the `credex-core-permissions` policy in the AWS IAM console.
4. Test the deployment process to ensure all necessary permissions are in place.

By following these setup instructions, you'll have the necessary environment configuration for deploying the credex-core application across all environments.