# Deployer's Guide for Development, Staging, and Production

The credex-core application is deployed using AWS services (including ECS, ECR), Terraform for infrastructure management, and GitHub Actions for CI/CD. The application relies on Neo4j Enterprise Edition for data storage and management. This guide provides comprehensive instructions for setting up, deploying, and maintaining the application and its associated Neo4j instances across all environments.

- The `development` environment and databases are intended to provide initial deployment testing of deployment changes on private data by manually-triggered deployment off the `dev` branch.
- The `staging` environment and databases are intended to provide large-scale testing in a stable environment, and are deployed automatically by pushes to the `stage` branch.
- The `production` environment enables members to interact with the production databases that host the live ledger of the credex ecosystem. This environment is deployed automatically by pushes to the `prod` branch (to be changed to any changes to `prod` being deployed every day just after midnight UTC at the end of the DCO).

## Deployment Overview

**Any work that changes files in /.github/workflows or /terraform impacts the application deployment process**, and must first be tested on the `dev` branch by a developer with the AWS and Github App access keys. For the purpose of these docs, a developer with the AWS access codes is a "deployer".

Our permissions are currently set (should be updated, key validation is enough, branch protection unneeded) so that the AWS `development` environment can only be deployed from the `dev` branch, so a deployer must do their work directly on that branch, push changes, then call the development deployment script with:

```bash
npx ts-node terraform/trigger-dev-deploy.ts
```

This script will:

- Authenticate with the development GitHub App
- Fetch development-specific secrets from the Development environment
- Trigger the development deployment workflow
- Run follow-up tests

Note: This `trigger-dev-deploy.ts` script is intended for use in the development environment on the `dev` branch. It's a full dry run privately that logs to your terminal, before going to stage.

Note to code reviewers: Developers are technically able to make changes to deployment code (workflows or terraform). But such changes should not be made by anyone who can't test them, and should not be deployed to `stage` untested.

Please refer to the documents linked below for detailed information on each aspect of the deployment process, including specific considerations for Neo4j management and monitoring.

## Neo4j in credex-core

Neo4j Enterprise Edition plays a crucial role in the credex-core application:

- It serves as the primary database for storing and managing application data.
- We maintain separate instances for LedgerSpace and SearchSpace in production.
- The deployment and management of Neo4j instances are handled through Terraform.
- Special considerations are given to Neo4j license management and monitoring.

For detailed information on Neo4j deployment, management, and monitoring, refer to the [Infrastructure Management](infrastructure_management.md) and [Monitoring and Troubleshooting](monitoring_and_troubleshooting.md) documents.

## Deployer Guides

- [Environment Setup](environment_setup.md): Outlines the setup process for development, staging, and production environments, including prerequisites, environment variables, and IAM configurations.

- [Infrastructure Management](infrastructure_management.md): Covers the process of managing the infrastructure using Terraform and AWS services, including ECS task definitions, Neo4j deployment and license management, and AMI management.

- [Deployment Process](deployment_process.md): Details the automated deployment process via GitHub Actions, environment-specific behaviors, and the overall deployment workflow.

- [Monitoring and Troubleshooting](monitoring_and_troubleshooting.md): Provides guidance on monitoring the application and Neo4j instances using CloudWatch and other tools, and troubleshooting common issues across different aspects of the system.

- [Security Considerations](security_considerations.md): Outlines important security aspects of the deployment process and infrastructure, including secrets management, network security, and access management.

- [Maintenance and Updates](maintenance_and_updates.md): Covers the processes for maintaining the application and infrastructure, including Neo4j instances, as well as how to handle updates across different environments.

- [Continuous Improvement](continuous_improvement.md): Suggests strategies for ongoing improvement of the deployment process and infrastructure, including enhancing monitoring, security measures, and developer experience.

- [Deployment Scenarios](deployment_scenarios.md): Describes various deployment scenarios and provides guidance on how to handle each situation, including initial deployments, updates, and rollbacks.
