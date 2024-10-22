# Connectors Workflow and Infrastructure

This document provides an overview of the connectors workflow and the associated infrastructure managed by Terraform.

## Connectors Workflow

The `.github/workflows/connectors.yml` file defines a GitHub Actions workflow for deploying and managing AWS infrastructure components. Key aspects of this workflow include:

1. **Trigger**: The workflow is manually triggered (`workflow_dispatch`) with two input parameters:
   - `action`: Specifies the action to perform (create/update/import)
   - `component`: Specifies which component to manage. Options include:
     - `all`: Manages all components
     - `vpc`: Virtual Private Cloud
     - `subnets`: Network subnets
     - `igw`: Internet Gateway
     - `nat`: NAT Gateway
     - `routes`: Route tables
     - `sg`: Security Groups
     - `ecr`: Elastic Container Registry
     - `ecs`: Elastic Container Service
     - `logs`: CloudWatch Logs
     - `iam`: Identity and Access Management roles
     - `alb`: Application Load Balancer
     - `keypair`: EC2 Key Pair
     - `neo4j_sg`: Neo4j Security Group
     - `acm`: AWS Certificate Manager

2. **Environment**: The workflow determines the environment (development, staging, or production) based on the Git branch.

3. **Steps**:
   - Checkout code
   - Configure AWS credentials
   - Setup Terraform
   - Initialize Terraform
   - Set Terraform variables based on the selected component
   - Plan Terraform changes
   - Apply Terraform changes
   - Retrieve and output infrastructure details

## Terraform Module Structure

The Terraform configuration for the connectors is organized into two main parts:

### 1. Main Connectors Module

The entry point is `terraform/modules/connectors/main.tf`. This file:

- Defines local variables for common tags and the full domain name.
- Generates an RSA key pair using the `tls_private_key` resource.
- Calls the Shared Resources submodule, passing necessary variables and the generated public key.

### 2. Shared Resources Submodule

Located at `terraform/modules/connectors/shared_resources/`, this submodule is responsible for creating all the actual AWS resources. It includes:

- VPC
- Public and private subnets
- Internet Gateway
- NAT Gateway
- Route tables
- Security groups (ALB, ECS tasks, Neo4j)
- Key pair
- Application Load Balancer
- Target group
- ACM certificate
- ALB listener

The main module controls which resources are created by passing boolean variables (e.g., `create_vpc`, `create_subnets`, etc.) to the shared resources submodule. This allows for selective creation of resources based on the `component` input in the GitHub Actions workflow.

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

## Conclusion

The connectors workflow and associated Terraform configuration provide a flexible and modular approach to managing AWS infrastructure. It sets up the core networking, security, and load balancing components that support both EC2-based Neo4j databases and Fargate-based application deployment. By using variables to control resource creation, it allows for granular management of different components across various environments.
