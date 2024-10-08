# Neo4j Deployment and Management

## Overview

This document provides a comprehensive guide to the deployment, management, and maintenance of Neo4j Enterprise Edition across our development, staging, and production environments.

## Table of Contents

- [Neo4j Deployment and Management](#neo4j-deployment-and-management)
  - [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [License Management](#license-management)
  - [Deployment Process](#deployment-process)
  - [Environment Configuration](#environment-configuration)
  - [Monitoring and Maintenance](#monitoring-and-maintenance)
  - [Testing and Validation](#testing-and-validation)
  - [Troubleshooting](#troubleshooting)
  - [Conclusion](#conclusion)

## License Management

Refer to [Neo4j License Management](./neo4j_license_management.md) for detailed information on:
- License details and limitations
- License allocation across environments
- Process for storing and applying the license
- License renewal procedures

## Deployment Process

Our Neo4j deployment is managed through Terraform and GitHub Actions:

1. The Neo4j Enterprise license is stored as a GitHub secret (`NEO4J_ENTERPRISE_LICENSE`).
2. The deployment workflows (`.github/workflows/deploy-{environment}.yml`) retrieve the license and pass it to Terraform.
3. Terraform (`terraform/main.tf` and `terraform/neo4j.tf`) provisions Neo4j instances and applies the license.
4. After the initial deployment, a post-deployment configuration step updates the AWS Systems Manager Parameter Store with the actual Neo4j instance details.

Key files:
- `.github/workflows/deploy-development.yml`: GitHub Actions workflow for development
- `.github/workflows/deploy-staging.yml`: GitHub Actions workflow for staging
- `.github/workflows/deploy-production.yml`: GitHub Actions workflow for production
- `terraform/main.tf`: Main Terraform configuration including Neo4j-related resources
- `terraform/neo4j.tf`: Specific Terraform configuration for Neo4j instances
- `terraform/ssm.tf`: AWS Systems Manager configuration

Post-Deployment Configuration:
- A `null_resource` in `terraform/main.tf` is used to update the SSM parameters with the actual Neo4j instance details after they are created.
- This step ensures that the correct Neo4j connection information is available for the application to use, even when the initial deployment doesn't have this information.

**Important Note**: Always test any changes to the deployment process in a safe environment (preferably development) before applying them to production. This helps ensure that the changes work as expected and don't introduce any issues in the production environment.

## Environment Configuration

We maintain three environments, each with its own configuration:

1. **Development**:
   - Triggered by manual workflow dispatch
   - Uses `credex-core-development` ECR repository
   - ECS cluster: `credex-cluster-development`
   - ECS service: `credex-core-service-development`
   - Log level: debug

2. **Staging**:
   - Triggered by push to `stage` branch
   - Uses `credex-core-staging` ECR repository
   - ECS cluster: `credex-cluster-staging`
   - ECS service: `credex-core-service-staging`
   - Log level: debug

3. **Production**:
   - Triggered by push to `prod` branch
   - Uses `credex-core-production` ECR repository
   - ECS cluster: `credex-cluster-production`
   - ECS service: `credex-core-service-production`
   - Log level: info

All environments:
- Use the same Neo4j Enterprise license, adhering to the license limitations
- Deploy to the `af-south-1` AWS region
- Use Fargate for ECS tasks
- Have separate Neo4j instances for ledger and search spaces

## Monitoring and Maintenance

Refer to [Neo4j Monitoring and Maintenance](./neo4j_monitoring.md) for detailed information on:
- Instance health checks
- Neo4j-specific metrics monitoring
- Log monitoring
- License expiration monitoring
- Backup procedures
- Version update process
- Performance tuning
- Security updates
- Incident response procedures

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

Refer to [Neo4j License Validation Test Cases](./testing/neo4j_license_validation.md) for additional:
- Test cases to ensure license compliance
- Procedures for validating Neo4j Enterprise Edition functionality
- Steps for verifying correct license application

## Troubleshooting

Common issues and their solutions:

1. **License not applied correctly**:
   - Verify the `NEO4J_ENTERPRISE_LICENSE` secret in GitHub
   - Check Terraform logs for any errors during license application
   - Manually inspect the license file on the Neo4j instances

2. **Neo4j instance not starting**:
   - Check instance logs in AWS CloudWatch
   - Verify security group settings allow necessary traffic
   - Ensure instance has sufficient resources (CPU, memory)

3. **Unable to connect to Neo4j**:
   - Verify network configuration and security group rules
   - Check Neo4j process status on the instance
   - Review Neo4j logs for any startup errors

4. **Performance issues**:
   - Review monitoring metrics for resource bottlenecks
   - Analyze slow query logs
   - Consider scaling up instance size or optimizing queries

5. **Deployment failures**:
   - Check GitHub Actions logs for specific error messages
   - Verify AWS credentials and permissions
   - Ensure all required secrets are properly set in GitHub

6. **Incorrect Neo4j connection information**:
   - Verify that the post-deployment configuration step completed successfully
   - Check the AWS Systems Manager Parameter Store for updated Neo4j connection details
   - If necessary, manually update the SSM parameters with the correct Neo4j instance information

For any persistent issues, contact Neo4j support with relevant logs and configuration details.

## Conclusion

This document provides an overview of our Neo4j deployment and management processes. Always refer to the specific documentation linked in each section for more detailed information. Regularly review and update these procedures as our system evolves and new requirements emerge.