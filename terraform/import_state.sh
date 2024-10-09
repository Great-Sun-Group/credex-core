#!/bin/bash

# Terraform State Import Script

set -e

# Function to import a resource if it doesn't exist in the state
import_resource() {
    local resource_type=$1
    local resource_name=$2
    local resource_id=$3

    if ! terraform state list | grep -q "$resource_type.$resource_name"; then
        echo "Importing $resource_type.$resource_name"
        terraform import "$resource_type.$resource_name" "$resource_id"
    else
        echo "$resource_type.$resource_name already exists in the state"
    fi
}

# Ensure we're in the correct directory
cd "$(dirname "$0")"

# Initialize Terraform
terraform init

# Select the appropriate workspace
terraform workspace select ${TF_VAR_environment}

# Import ACM certificate
CERT_ARN=$(aws acm list-certificates --query 'CertificateSummaryList[?DomainName==`'${TF_VAR_domain}'`].CertificateArn' --output text)
import_resource "aws_acm_certificate" "credex_cert[0]" "$CERT_ARN"

# Import ALB security group
ALB_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=credex-alb-sg-${TF_VAR_environment}" --query 'SecurityGroups[0].GroupId' --output text)
import_resource "aws_security_group" "alb[0]" "$ALB_SG_ID"

# Import ECS tasks security group
ECS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=credex-core-ecs-tasks-sg-${TF_VAR_environment}" --query 'SecurityGroups[0].GroupId' --output text)
import_resource "aws_security_group" "ecs_tasks[0]" "$ECS_SG_ID"

# Import Neo4j security group
NEO4J_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=credex-neo4j-sg-${TF_VAR_environment}" --query 'SecurityGroups[0].GroupId' --output text)
import_resource "aws_security_group" "neo4j[0]" "$NEO4J_SG_ID"

# Import SSM parameters
for param in $(aws ssm describe-parameters --parameter-filters "Key=Name,Values=/credex/${TF_VAR_environment}/" --query 'Parameters[*].Name' --output text); do
    param_name=$(basename "$param")
    import_resource "aws_ssm_parameter" "params[\"$param_name\"]" "$param"
done

# Import Neo4j instances
NEO4J_INSTANCES=$(aws ec2 describe-instances --filters "Name=tag:Project,Values=CredEx" "Name=tag:Environment,Values=${TF_VAR_environment}" "Name=instance-state-name,Values=running" --query 'Reservations[*].Instances[*].[InstanceId]' --output text)
i=0
for instance_id in $NEO4J_INSTANCES; do
    import_resource "aws_instance" "neo4j[$i]" "$instance_id"
    i=$((i+1))
done

# Import ECS cluster
ECS_CLUSTER_ARN=$(aws ecs list-clusters --query "clusterArns[?contains(@, 'credex-cluster-${TF_VAR_environment}')]" --output text)
import_resource "aws_ecs_cluster" "credex_cluster" "$ECS_CLUSTER_ARN"

# Import ECS service
ECS_SERVICE_ARN=$(aws ecs list-services --cluster "$ECS_CLUSTER_ARN" --query "serviceArns[?contains(@, 'credex-core-service-${TF_VAR_environment}')]" --output text)
import_resource "aws_ecs_service" "credex_core_service[0]" "$ECS_SERVICE_ARN"

echo "Import process completed successfully"