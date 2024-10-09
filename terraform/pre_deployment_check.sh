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
        "aws_lb")
            aws elbv2 describe-load-balancers --query "LoadBalancers[?LoadBalancerName=='$resource_name'].LoadBalancerArn" --output text | grep -q .
            ;;
        *)
            echo "Unknown resource type: $resource_type"
            return 1
            ;;
    esac
}

# Initialize use_existing_resources map
declare -A use_existing_resources=(
    ["vpc"]=false
    ["subnets"]=false
    ["security_groups"]=false
    ["ecs_cluster"]=false
    ["ecs_service"]=false
    ["ecs_task_definition"]=false
    ["alb"]=false
    ["acm_certificate"]=false
    ["route53_record"]=false
    ["neo4j_instances"]=false
    ["ssm_parameters"]=false
)

# Check for existing resources
echo "Checking for existing resources..."

if resource_exists "aws_acm_certificate" "${TF_VAR_domain}"; then
    echo "ACM Certificate exists"
    use_existing_resources["acm_certificate"]=true
fi

if resource_exists "aws_security_group" "credex-alb-sg-${TF_VAR_environment}"; then
    echo "ALB Security Group exists"
    use_existing_resources["security_groups"]=true
fi

if resource_exists "aws_security_group" "credex-core-ecs-tasks-sg-${TF_VAR_environment}"; then
    echo "ECS Tasks Security Group exists"
    use_existing_resources["security_groups"]=true
fi

if resource_exists "aws_security_group" "credex-neo4j-sg-${TF_VAR_environment}"; then
    echo "Neo4j Security Group exists"
    use_existing_resources["security_groups"]=true
fi

if resource_exists "aws_ecs_cluster" "credex-cluster-${TF_VAR_environment}"; then
    echo "ECS Cluster exists"
    use_existing_resources["ecs_cluster"]=true
fi

if resource_exists "aws_ecs_service" "credex-core-service-${TF_VAR_environment}"; then
    echo "ECS Service exists"
    use_existing_resources["ecs_service"]=true
    use_existing_resources["ecs_task_definition"]=true
fi

if resource_exists "aws_lb" "credex-alb-${TF_VAR_environment}"; then
    echo "ALB exists"
    use_existing_resources["alb"]=true
fi

if resource_exists "aws_instance" "Neo4j-${TF_VAR_environment}-LedgerSpace"; then
    echo "Neo4j instances exist"
    use_existing_resources["neo4j_instances"]=true
fi

if resource_exists "aws_ssm_parameter" "/credex/${TF_VAR_environment}/jwt_secret"; then
    echo "SSM parameters exist"
    use_existing_resources["ssm_parameters"]=true
fi

# Convert the bash associative array to a JSON string
use_existing_resources_json=$(declare -p use_existing_resources | sed -e "s/declare -A use_existing_resources=//" -e "s/([^)]*)//" | jq -R 'split(" ")| map(split("="))|from_entries')

# Set TF_VAR_use_existing_resources
export TF_VAR_use_existing_resources="$use_existing_resources_json"

echo "Setting TF_VAR_use_existing_resources to: $TF_VAR_use_existing_resources"

# If resources exist, run the import script
if [[ "$use_existing_resources_json" != *"false"* ]]; then
    echo "Existing resources found. Running import script..."
    ./import_existing_resources.sh
fi

# Run Terraform plan
echo "Running Terraform plan..."
terraform plan

echo "Pre-deployment check completed successfully"