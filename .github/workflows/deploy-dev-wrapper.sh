#!/bin/bash

# Get the current branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check if AWS secrets are available in the environment
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "Error: AWS credentials are not set in the environment."
    echo "Please ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set."
    exit 1
fi

# Run the GitHub Actions workflow
gh workflow run deploy-development.yml -f branch=$CURRENT_BRANCH

echo "Deployment triggered for branch: $CURRENT_BRANCH"
echo "Check GitHub Actions for progress."