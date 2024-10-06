#!/bin/bash

# Get the current branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed. Please install it to proceed."
    echo "Installation instructions: https://cli.github.com/manual/installation"
    exit 1
fi

# Check if the user is authenticated with GitHub CLI
if ! gh auth status &> /dev/null; then
    echo "Error: You are not authenticated with GitHub CLI."
    echo "Please run 'gh auth login' to authenticate."
    exit 1
fi

# Get the repository name from the remote URL
REPO_URL=$(git config --get remote.origin.url)
REPO_NAME=$(basename -s .git $REPO_URL)

echo "Triggering deployment for branch: $CURRENT_BRANCH"

# Trigger the workflow using the file name
WORKFLOW_ID=$(gh workflow run deploy-development.yml --ref $CURRENT_BRANCH -f branch=$CURRENT_BRANCH)

if [ $? -ne 0 ]; then
    echo "Error: Failed to trigger the workflow."
    exit 1
fi

echo "Workflow triggered successfully. Streaming logs..."

# Extract run ID from the workflow run
RUN_ID=$(echo $WORKFLOW_ID | grep -oP '(?<=ID )[0-9]+')

# Stream the workflow logs
gh run watch $RUN_ID --exit-status

if [ $? -eq 0 ]; then
    echo "Deployment completed successfully."
else
    echo "Deployment failed. Please check the logs above for more details."
fi