#!/bin/bash

set -e

echo "Starting deployment and verification process..."

# Run Terraform
terraform init
terraform apply -auto-approve

# Extract necessary information from Terraform output
API_URL=$(terraform output -raw api_url)
CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
SERVICE_NAME=$(terraform output -raw ecs_service_name)

# Wait for ECS service to be stable
echo "Waiting for ECS service to be stable..."
aws ecs wait services-stable --cluster $CLUSTER_NAME --services $SERVICE_NAME

echo "ECS service is stable. Starting verification process..."

# Run ECS status check
./check_ecs_status.sh $CLUSTER_NAME $SERVICE_NAME

# Run health check
echo "Performing health check..."
HEALTH_CHECK_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)
if [ $HEALTH_CHECK_RESPONSE -eq 200 ]; then
    echo "Health check passed: $HEALTH_CHECK_RESPONSE"
else
    echo "Health check failed: $HEALTH_CHECK_RESPONSE"
    exit 1
fi

# Run integration tests
echo "Running integration tests..."
API_URL=$API_URL node post_deployment_tests.js

# Run performance benchmark
echo "Running performance benchmark..."
API_URL=$API_URL node benchmark.js

echo "Deployment and verification process completed successfully."