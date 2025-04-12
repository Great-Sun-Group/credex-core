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

# Verify credentials are set (safely)
if [ -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "Error: AWS_ACCESS_KEY_ID is not set"
    exit 1
fi
if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "Error: AWS_SECRET_ACCESS_KEY is not set"
    exit 1
fi
echo "AWS credentials are set"
echo "Using AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID:0:5}..."
echo "AWS Region: $AWS_REGION"

# Initialize with correct backend config
echo "Initializing Terraform for $ENV environment..."
terraform init -reconfigure \
  -backend-config="bucket=credexbuckets3-deploy-state-$ENV" \
  -backend-config="key=terraform.tfstate" \
  -backend-config="region=af-south-1" \
  -backend-config="dynamodb_table=credexbuckets3-deploy-state-lock-$ENV"

# Run force-unlock command directly without extra vars
echo "Running terraform force-unlock..."
terraform force-unlock -force "$2"
