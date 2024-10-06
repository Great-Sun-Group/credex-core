#!/bin/bash

set -e

# NOTE: This script is designed to be run after changes have been pushed to the 'dev' branch.
# GitHub Actions workflows are typically triggered from the default branch (usually 'main' or 'dev').
# Ensure your changes are merged and pushed to 'dev' before running this script.

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed. Please install it to proceed."
    echo "Installation instructions: https://cli.github.com/manual/installation"
    exit 1
fi

# Get GitHub token
GITHUB_TOKEN=$(gh auth token)

if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: Unable to get GitHub token. Please ensure you're authenticated with GitHub CLI."
    exit 1
fi

# Get the repository name from the remote URL
REPO_URL=$(git config --get remote.origin.url)
REPO_OWNER=$(echo $REPO_URL | sed -n 's/.*github.com[:\/]\([^\/]*\)\/.*/\1/p')
REPO_NAME=$(basename -s .git $REPO_URL)

echo "Repository: $REPO_OWNER/$REPO_NAME"

echo "Triggering deployment for 'dev' branch..."

# Execute the API request to trigger the workflow
RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/workflows/deploy-development.yml/dispatches" \
  -d '{"ref":"dev", "inputs": {"branch":"dev"}}')

# Check if the curl command was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to trigger the workflow. API request failed."
    echo "Response: $RESPONSE"
    exit 1
fi

echo "Workflow triggered successfully."

# Fetch recent workflow runs
echo "Fetching recent workflow runs..."

RUNS=$(gh run list --workflow=deploy-development.yml --limit 1 --json databaseId,headBranch)

# Extract the run ID for the dev branch
RUN_ID=$(echo $RUNS | jq -r '.[] | select(.headBranch == "dev") | .databaseId')

if [ -z "$RUN_ID" ]; then
    echo "Error: Could not find a recent run for the 'dev' branch."
    exit 1
fi

echo "Found run ID: $RUN_ID"
echo "Streaming logs for run ID: $RUN_ID"

# Stream the workflow logs
gh run watch $RUN_ID

if [ $? -eq 0 ]; then
    echo "Deployment completed successfully."
else
    echo "Deployment failed. Please check the logs above for more details."
fi