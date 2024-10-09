#!/bin/bash

# Terraform State Import Script
# This script imports existing resources into Terraform state

# Exit immediately if a command exits with a non-zero status
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

# Make sure we're in the correct directory
cd "$(dirname "$0")"

# Initialize Terraform
terraform init

# Import ACM certificate
CERT_ARN=$(aws acm list-certificates --query 'CertificateSummaryList[?DomainName==`'"$TF_VAR_domain"'`].CertificateArn' --output text)
import_resource "aws_acm_certificate" "credex_cert" "$CERT_ARN"

# Import ALB security group
ALB_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=credex-alb-sg-${TF_VAR_environment}" --query 'SecurityGroups[0].GroupId' --output text)
import_resource "aws_security_group" "alb" "$ALB_SG_ID"

# Import ECS tasks security group
ECS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=credex-core-ecs-tasks-sg-${TF_VAR_environment}" --query 'SecurityGroups[0].GroupId' --output text)
import_resource "aws_security_group" "ecs_tasks" "$ECS_SG_ID"

# Import Neo4j security group
NEO4J_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=credex-neo4j-sg-${TF_VAR_environment}" --query 'SecurityGroups[0].GroupId' --output text)
import_resource "aws_security_group" "neo4j" "$NEO4J_SG_ID"

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

echo "Import process completed successfully"