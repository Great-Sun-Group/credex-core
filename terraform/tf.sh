#!/bin/bash

# Exit on any error
set -e

# Default to development if no environment specified
ENV=${1:-development}

# Validate environment
valid_envs=("development" "staging" "production" "model_001")
if [[ ! " ${valid_envs[@]} " =~ " ${ENV} " ]]; then
    echo "Error: Invalid environment. Must be one of: ${valid_envs[*]}"
    exit 1
fi

# Map environment to credential variables
case $ENV in
    "development")
        export AWS_ACCESS_KEY_ID=$CREDEXCORE_DEV_AWS_ACCESS_KEY
        export AWS_SECRET_ACCESS_KEY=$CREDEXCORE_DEV_AWS_SECRET_ACCESS_KEY
        ;;
    "staging")
        export AWS_ACCESS_KEY_ID=$CREDEXCORE_STAGING_AWS_ACCESS_KEY
        export AWS_SECRET_ACCESS_KEY=$CREDEXCORE_STAGING_AWS_SECRET_KEY
        ;;
    "production")
        export AWS_ACCESS_KEY_ID=$CREDEXCORE_PROD_AWS_ACCESS_KEY
        export AWS_SECRET_ACCESS_KEY=$CREDEXCORE_PROD_AWS_SECRET_KEY
        ;;
    "model_001")
        export AWS_ACCESS_KEY_ID=$CREDEXCORE_MODEL001_AWS_ACCESS_KEY
        export AWS_SECRET_ACCESS_KEY=$CREDEXCORE_MODEL001_AWS_SECRET_KEY
        ;;
esac

# Set AWS region from environments.tf configuration
export AWS_REGION="af-south-1"

# Get terraform command (default to 'plan' if not specified)
TF_CMD=${2:-plan}

# Initialize if needed with correct backend config
if [ ! -d ".terraform" ] || [ "$3" == "-init" ]; then
    echo "Initializing Terraform for $ENV environment..."
    terraform init -backend-config="bucket=credexbuckets2-deploy-state-$ENV"
fi

# Run terraform command with environment and variables
echo "Running: terraform $TF_CMD for $ENV environment"
terraform $TF_CMD \
    -var="environment=$ENV" \
    -var="docker_image=dummy-image:latest" \
    -var="neo4j_enterprise_license=$NEO4J_ENTERPRISE_LICENSE" \
    -var="firebase_project_id=$FIREBASE_PROJECT_ID" \
    -var="firebase_client_email=$FIREBASE_CLIENT_EMAIL" \
    -var="firebase_private_key=$FIREBASE_PRIVATE_KEY"

# Usage instructions if no command specified
if [ $# -eq 0 ]; then
    echo ""
    echo "Usage: $0 <environment> <command> [-init]"
    echo "  environment: development (default), staging, production, model_001"
    echo "  command: plan (default), apply, destroy, etc."
    echo "  -init: Optional flag to force re-initialization"
    echo ""
    echo "Examples:"
    echo "  $0 development plan"
    echo "  $0 staging apply"
    echo "  $0 production plan -init"
fi
