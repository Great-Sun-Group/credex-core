#!/bin/bash

set -e

# Function to prompt for environment selection
select_environment() {
    PS3="Select the environment to deploy: "
    select env in "production" "staging" "development"; do
        case $env in
            production|staging|development ) echo $env; return;;
            *) echo "Invalid selection. Please choose 1 for production, 2 for staging, or 3 for development.";;
        esac
    done
}

# Function to verify AWS credentials
verify_aws_credentials() {
    if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ] || [ -z "$AWS_DEFAULT_REGION" ]; then
        echo "Error: AWS credentials are not set in the environment."
        echo "Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_DEFAULT_REGION."
        exit 1
    fi
    echo "AWS credentials verified."
}

# Function to verify Neo4j credentials
verify_neo4j_credentials() {
    local env=$1
    if [ -z "$NEO4J_LEDGER_SPACE_USER" ] || [ -z "$NEO4J_LEDGER_SPACE_PASS" ] || \
       [ -z "$NEO4J_SEARCH_SPACE_USER" ] || [ -z "$NEO4J_SEARCH_SPACE_PASS" ]; then
        echo "Error: Neo4j credentials are not set in the environment for $env."
        echo "Please set NEO4J_LEDGER_SPACE_USER, NEO4J_LEDGER_SPACE_PASS,"
        echo "NEO4J_SEARCH_SPACE_USER, and NEO4J_SEARCH_SPACE_PASS."
        exit 1
    fi
    echo "Neo4j credentials verified for $env."
    echo "Note: Neo4j bolt URLs are now stored in AWS Parameter Store."
}

# Function to trigger GitHub Actions workflow
trigger_github_actions_workflow() {
    local env=$1
    local workflow_file="deploy-${env}.yml"
    
    echo "Triggering GitHub Actions workflow for $env environment..."

    # Ensure GitHub CLI is installed
    if ! command -v gh &> /dev/null; then
        echo "Error: GitHub CLI (gh) is not installed. Please install it to proceed."
        exit 1
    fi

    # Trigger the workflow
    if ! gh workflow run $workflow_file; then
        echo "Error: Failed to trigger GitHub Actions workflow."
        exit 1
    fi

    echo "GitHub Actions workflow triggered successfully."
    echo "You can check the progress of the deployment in the Actions tab of your GitHub repository."
}

# Determine the environment
if [ "$NODE_ENV" = "development" ]; then
    ENVIRONMENT=$(select_environment)
elif [ "$NODE_ENV" = "production" ] || [ "$NODE_ENV" = "staging" ]; then
    ENVIRONMENT=$NODE_ENV
else
    echo "Error: Unable to determine the environment. Please set NODE_ENV to development, production, or staging."
    exit 1
fi

echo "Starting deployment process for $ENVIRONMENT environment..."

# Verify AWS credentials
verify_aws_credentials

# Verify Neo4j credentials
verify_neo4j_credentials $ENVIRONMENT

# Trigger GitHub Actions workflow
trigger_github_actions_workflow "$ENVIRONMENT"

echo "Deployment process initiated for $ENVIRONMENT environment."
echo "Please check the GitHub Actions tab for deployment progress and results."

# Additional verification steps
echo "Performing additional verification steps..."

# Wait for ECS service to be stable (with timeout)
echo "Waiting for ECS service to be stable..."
timeout 300 aws ecs wait services-stable --cluster credex-cluster-$ENVIRONMENT --services credex-core-service-$ENVIRONMENT
if [ $? -ne 0 ]; then
    echo "Error: ECS service did not stabilize within the timeout period."
    exit 1
fi
echo "ECS service is stable."

# Perform a health check (adjust the URL as needed)
HEALTH_CHECK_URL="https://api.mycredex.app/health"
if [ "$ENVIRONMENT" = "staging" ]; then
    HEALTH_CHECK_URL="https://apistaging.mycredex.app/health"
elif [ "$ENVIRONMENT" = "development" ]; then
    HEALTH_CHECK_URL="https://apidev.mycredex.app/health"
fi

echo "Performing health check on $HEALTH_CHECK_URL..."
HEALTH_CHECK_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL)
if [ $HEALTH_CHECK_RESPONSE -eq 200 ]; then
    echo "Health check passed: $HEALTH_CHECK_RESPONSE"
else
    echo "Error: Health check failed with status code: $HEALTH_CHECK_RESPONSE"
    exit 1
fi

echo "Deployment and verification completed successfully for $ENVIRONMENT environment."