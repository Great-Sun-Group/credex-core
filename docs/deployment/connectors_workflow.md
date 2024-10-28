# Connectors Workflow and Infrastructure

This document provides an overview of the connectors workflow and the associated infrastructure managed by Terraform.

## Connectors Workflow

The `.github/workflows/connectors.yml` file defines a GitHub Actions workflow for deploying and managing AWS infrastructure components. Key aspects of this workflow include:

1. **Trigger**: The workflow is manually triggered (`workflow_dispatch`).

2. **Environment**: The workflow determines the environment (development, staging, or production) based on the Git branch.

3. **AWS Region**: The workflow is configured to use the af-south-1 (Cape Town) region.

4. **Steps**:
   - Checkout code
   - Configure AWS credentials
   - Setup Terraform
   - Create S3 bucket and DynamoDB table for Terraform state (if they don't exist)
   - Initialize Terraform
   - Plan Terraform changes
   - Apply Terraform changes
   - Retrieve and output infrastructure details

## Terraform Configuration

The Terraform configuration for the connectors is organized into a main module and a shared resources submodule:

### 1. Main Connectors Module

The entry point is `terraform/modules/connectors/main.tf`. This file:

- Defines local variables for common tags and the full domain name.
- Generates an RSA key pair using the `tls_private_key` resource.
- Calls the Shared Resources submodule, passing necessary variables and the generated public key.

### 2. Shared Resources Submodule

Located at `terraform/modules/connectors/shared_resources/`, this submodule is responsible for creating all the actual AWS resources.

## Infrastructure Components

The connectors workflow and Terraform configuration manage the following key infrastructure components:

1. **Networking**: VPC, subnets, Internet Gateway, NAT Gateway, and route tables.
2. **Security**: Security groups for ALB, ECS tasks, and Neo4j.
3. **Load Balancing**: Application Load Balancer with HTTPS listener and target group.
4. **Certificates**: ACM certificate for HTTPS.
5. **Access**: EC2 key pair for SSH access.
6. **Container Services**: ECR for storing Docker images and ECS for running containers.
7. **Monitoring**: CloudWatch Logs for log management.
8. **Identity and Access Management**: IAM roles for various services.

## EC2 Instances and Application Deployment

The connectors workflow sets up the infrastructure that supports EC2 instances for Neo4j databases and the application deployment:

- The VPC and subnets provide the network environment.
- Security groups control access to the instances.
- The key pair allows SSH access to the instances.

EC2 instances and application deployment are managed as follows:

- **Neo4j Databases**: The databases module creates EC2 instances for Neo4j databases.
- **Application Deployment**: The application is deployed using AWS Fargate, which is a serverless compute engine for containers that works with Amazon ECS.

### Fargate Deployment

For the Fargate deployment, the following parts of the infrastructure are used:

1. **VPC and Subnets**: Fargate tasks run in the private subnets of the VPC.
2. **Security Groups**: The ECS tasks security group controls access to the Fargate tasks.
3. **Load Balancer**: The Application Load Balancer routes traffic to the Fargate tasks.
4. **Target Group**: The ALB target group is used to register the Fargate tasks.
5. **ECS Cluster**: An ECS cluster is used to manage the Fargate tasks.
6. **ECR**: Stores the Docker images used by the Fargate tasks.

The actual creation and management of the ECS cluster, task definitions, and services for Fargate are handled in the `app.yml` workflow and associated terraform module.

## Infrastructure Outputs

After applying the Terraform changes, the workflow outputs key infrastructure details, including:

- VPC ID
- Subnet IDs
- Neo4j Security Group ID
- Key Pair Name
- ALB Security Group ID

These outputs are crucial for other modules and workflows that depend on the infrastructure created by the connectors workflow. These values are printed to the workflow logs, and are made accessible programmatically to the other modules.

## Conclusion

The connectors workflow and associated Terraform configuration provide a flexible and modular approach to managing AWS infrastructure. It sets up the core networking, security, and load balancing components that support both EC2-based Neo4j databases and Fargate-based application deployment. The workflow ensures that the necessary infrastructure is in place before the databases and application are deployed.