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

# Parse the TF_VAR_use_existing_resources JSON string
eval "$(echo "$TF_VAR_use_existing_resources" | jq -r 'to_entries | .[] | "USE_EXISTING_\(.key|ascii_upcase)=\(.value)"')"

# Import ACM certificate
if [ "$USE_EXISTING_ACM_CERTIFICATE" = "true" ]; then
    CERT_ARN=$(aws acm list-certificates --query 'CertificateSummaryList[?DomainName==`'"$TF_VAR_domain"'`].CertificateArn' --output text)
    import_resource "aws_acm_certificate" "credex_cert[0]" "$CERT_ARN"
fi

# Import security groups
if [ "$USE_EXISTING_SECURITY_GROUPS" = "true" ]; then
    # Import ALB security group
    ALB_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=credex-alb-sg-${TF_VAR_environment}" --query 'SecurityGroups[0].GroupId' --output text)
    import_resource "aws_security_group" "alb[0]" "$ALB_SG_ID"

    # Import ECS tasks security group
    ECS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=credex-core-ecs-tasks-sg-${TF_VAR_environment}" --query 'SecurityGroups[0].GroupId' --output text)
    import_resource "aws_security_group" "ecs_tasks[0]" "$ECS_SG_ID"

    # Import Neo4j security group
    NEO4J_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=credex-neo4j-sg-${TF_VAR_environment}" --query 'SecurityGroups[0].GroupId' --output text)
    import_resource "aws_security_group" "neo4j[0]" "$NEO4J_SG_ID"
fi

# Import SSM parameters
if [ "$USE_EXISTING_SSM_PARAMETERS" = "true" ]; then
    for param in $(aws ssm describe-parameters --parameter-filters "Key=Name,Values=/credex/${TF_VAR_environment}/" --query 'Parameters[*].Name' --output text); do
        param_name=$(basename "$param")
        import_resource "aws_ssm_parameter" "params[\"$param_name\"]" "$param"
    done
fi

# Import Neo4j instances
if [ "$USE_EXISTING_NEO4J_INSTANCES" = "true" ]; then
    NEO4J_INSTANCES=$(aws ec2 describe-instances --filters "Name=tag:Project,Values=CredEx" "Name=tag:Environment,Values=${TF_VAR_environment}" "Name=instance-state-name,Values=running" --query 'Reservations[*].Instances[*].[InstanceId]' --output text)
    i=0
    for instance_id in $NEO4J_INSTANCES; do
        import_resource "aws_instance" "neo4j[$i]" "$instance_id"
        i=$((i+1))
    done
fi

# Import ALB
if [ "$USE_EXISTING_ALB" = "true" ]; then
    ALB_ARN=$(aws elbv2 describe-load-balancers --names "credex-alb-${TF_VAR_environment}" --query 'LoadBalancers[0].LoadBalancerArn' --output text)
    import_resource "aws_lb" "credex_alb[0]" "$ALB_ARN"

    # Import ALB listener
    LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --query 'Listeners[?Protocol==`HTTPS`].ListenerArn' --output text)
    import_resource "aws_lb_listener" "credex_listener[0]" "$LISTENER_ARN"

    # Import target group
    TG_ARN=$(aws elbv2 describe-target-groups --names "credex-tg-${TF_VAR_environment}" --query 'TargetGroups[0].TargetGroupArn' --output text)
    import_resource "aws_lb_target_group" "credex_core[0]" "$TG_ARN"
fi

# Import ECS cluster
if [ "$USE_EXISTING_ECS_CLUSTER" = "true" ]; then
    CLUSTER_ARN=$(aws ecs list-clusters --query "clusterArns[?contains(@, 'credex-cluster-${TF_VAR_environment}')]" --output text)
    import_resource "aws_ecs_cluster" "credex_cluster" "$CLUSTER_ARN"
fi

# Import ECS service
if [ "$USE_EXISTING_ECS_SERVICE" = "true" ]; then
    SERVICE_ARN=$(aws ecs list-services --cluster "credex-cluster-${TF_VAR_environment}" --query "serviceArns[?contains(@, 'credex-core-service-${TF_VAR_environment}')]" --output text)
    import_resource "aws_ecs_service" "credex_core_service[0]" "$SERVICE_ARN"
fi

# Import ECS task definition
if [ "$USE_EXISTING_ECS_TASK_DEFINITION" = "true" ]; then
    TASK_DEF_ARN=$(aws ecs list-task-definitions --family-prefix "credex-core-${TF_VAR_environment}" --sort DESC --max-items 1 --query 'taskDefinitionArns[0]' --output text)
    import_resource "aws_ecs_task_definition" "credex_core_task[0]" "$TASK_DEF_ARN"
fi

echo "Import process completed successfully"