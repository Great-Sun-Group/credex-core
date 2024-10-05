#!/bin/bash

set -e

# Function to prompt for environment selection
select_environment() {
    echo "Select the environment to deploy:"
    select env in "production" "staging"; do
        case $env in
            production|staging ) echo $env; return;;
            *) echo "Invalid selection. Please choose 1 for production or 2 for staging.";;
        esac
    done
}

# Determine the environment
if [ "$NODE_ENV" = "development" ]; then
    ENVIRONMENT=$(select_environment)
elif [ "$NODE_ENV" = "production" ] || [ "$NODE_ENV" = "staging" ]; then
    ENVIRONMENT=$NODE_ENV
else
    echo "Error: NODE_ENV is not set to a valid value (development, production, or staging)"
    exit 1
fi

echo "Starting deployment and verification process for $ENVIRONMENT environment..."

# Run Terraform
terraform init
terraform apply -auto-approve -var="environment=$ENVIRONMENT"

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
API_URL=$API_URL ENVIRONMENT=$ENVIRONMENT node post_deployment_tests.js

# Run performance benchmark
echo "Running performance benchmark..."
API_URL=$API_URL ENVIRONMENT=$ENVIRONMENT node benchmark.js

echo "Deployment and verification process completed successfully for $ENVIRONMENT environment."