#!/bin/bash

# Pre-deployment Check Script

set -e

# Ensure we're in the correct directory
cd "$(dirname "$0")"

# Initialize Terraform
terraform init

# Select the appropriate workspace
terraform workspace select ${TF_VAR_environment}

# Function to check if a resource exists in AWS
resource_exists() {
    local resource_type=$1
    local resource_name=$2
    
    case $resource_type in
        "aws_acm_certificate")
            aws acm list-certificates --query 'CertificateSummaryList[?DomainName==`'"$resource_name"'`].CertificateArn' --output text | grep -q .
            ;;
        "aws_security_group")
            aws ec2 describe-security-groups --filters "Name=group-name,Values=$resource_name" --query 'SecurityGroups[0].GroupId' --output text | grep -q .
            ;;
        "aws_ssm_parameter")
            aws ssm get-parameter --name "$resource_name" --query 'Parameter.Name' --output text 2>/dev/null | grep -q .
            ;;
        "aws_instance")
            aws ec2 describe-instances --filters "Name=tag:Name,Values=$resource_name" "Name=instance-state-name,Values=running" --query 'Reservations[*].Instances[*].[InstanceId]' --output text | grep -q .
            ;;
        "aws_ecs_cluster")
            aws ecs list-clusters --query "clusterArns[?contains(@, '$resource_name')]" --output text | grep -q .
            ;;
        "aws_ecs_service")
            aws ecs list-services --cluster "credex-cluster-${TF_VAR_environment}" --query "serviceArns[?contains(@, '$resource_name')]" --output text | grep -q .
            ;;
        *)
            echo "Unknown resource type: $resource_type"
            return 1
            ;;
    esac
}

# Check for existing resources
echo "Checking for existing resources..."

RESOURCES_EXIST=false

if resource_exists "aws_acm_certificate" "${TF_VAR_domain}"; then
    echo "ACM Certificate exists"
    RESOURCES_EXIST=true
fi

if resource_exists "aws_security_group" "credex-alb-sg-${TF_VAR_environment}"; then
    echo "ALB Security Group exists"
    RESOURCES_EXIST=true
fi

if resource_exists "aws_security_group" "credex-core-ecs-tasks-sg-${TF_VAR_environment}"; then
    echo "ECS Tasks Security Group exists"
    RESOURCES_EXIST=true
fi

if resource_exists "aws_security_group" "credex-neo4j-sg-${TF_VAR_environment}"; then
    echo "Neo4j Security Group exists"
    RESOURCES_EXIST=true
fi

if resource_exists "aws_ecs_cluster" "credex-cluster-${TF_VAR_environment}"; then
    echo "ECS Cluster exists"
    RESOURCES_EXIST=true
fi

if resource_exists "aws_ecs_service" "credex-core-service-${TF_VAR_environment}"; then
    echo "ECS Service exists"
    RESOURCES_EXIST=true
fi

# If resources exist, run the import script
if [ "$RESOURCES_EXIST" = true ]; then
    echo "Existing resources found. Running import script..."
    ./import_state.sh
else
    echo "No existing resources found."
fi

# Run Terraform plan
echo "Running Terraform plan..."
terraform plan -var="use_existing_resources=${RESOURCES_EXIST}"

echo "Pre-deployment check completed successfully"