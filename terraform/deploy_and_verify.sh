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
if [ "$GITHUB_ACTIONS" = "true" ]; then
    ENVIRONMENT=$GITHUB_ENVIRONMENT
elif [ "$NODE_ENV" = "development" ]; then
    ENVIRONMENT=$(select_environment)
elif [ "$NODE_ENV" = "production" ] || [ "$NODE_ENV" = "staging" ]; then
    ENVIRONMENT=$NODE_ENV
else
    echo "Error: Unable to determine the environment. Please set NODE_ENV to development, production, or staging."
    exit 1
fi

echo "Starting deployment and verification process for $ENVIRONMENT environment..."

# Ensure all required environment variables are set
required_vars=(
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_DEFAULT_REGION"
    "JWT_SECRET"
    "WHATSAPP_BOT_API_KEY"
    "OPEN_EXCHANGE_RATES_API"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set"
        exit 1
    fi
done

echo "All required environment variables are set."

# Debug: Print out if AWS credentials are set (without revealing the values)
echo "AWS_ACCESS_KEY_ID is set: Yes"
echo "AWS_SECRET_ACCESS_KEY is set: Yes"
echo "AWS_DEFAULT_REGION is set to: $AWS_DEFAULT_REGION"

# Run Terraform
terraform init
terraform apply -auto-approve -lock=false \
    -var="environment=$ENVIRONMENT" \
    -var="jwt_secret=$JWT_SECRET" \
    -var="whatsapp_bot_api_key=$WHATSAPP_BOT_API_KEY" \
    -var="open_exchange_rates_api=$OPEN_EXCHANGE_RATES_API"

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

# Re-enable state locking
terraform force-unlock -force $(terraform show -json | jq -r '.values.root_module.resources[] | select(.type == "terraform_remote_state") | .values.lock_id')

echo "State locking re-enabled."