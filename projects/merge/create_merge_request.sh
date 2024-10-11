#!/bin/bash

# Ensure the GitHub CLI is installed
if ! command -v gh &> /dev/null
then
    echo "GitHub CLI could not be found. Please install it first."
    exit 1
fi

# Ensure we're authenticated with GitHub
if ! gh auth status &> /dev/null
then
    echo "Please authenticate with GitHub first using 'gh auth login'"
    exit 1
fi

# Fetch the latest changes
git fetch origin

# Create a new branch for the merge request
git checkout -b merge-deploy5-to-dev origin/dev

# Merge the deploy5 branch into the new branch
git merge origin/deploy5

# Push the new branch to the remote repository
git push -u origin merge-deploy5-to-dev

# Create the pull request
gh pr create \
  --base dev \
  --head merge-deploy5-to-dev \
  --title "Merge deploy5 into dev: Comprehensive Update" \
  --body "This pull request merges changes from deploy5 into dev.

## Changes Overview:

1. Infrastructure and Deployment Changes:
   - Updates to Terraform configurations
   - New scripts for resource management and deployment checks
   - Modified GitHub workflow files

2. Development Environment Updates:
   - Changes to devcontainer configuration

3. Code Refinements:
   - Updates to Member API
   - Modifications to utility functions and middleware

4. Documentation Updates:
   - Changes to developer's guide and merge request guidelines

Please review these changes carefully, especially the Terraform modifications and new scripts.

## Instructions for Reviewers:
1. Review Terraform changes in main.tf, neo4j.tf, and networking.tf
2. Test new scripts in a safe environment
3. Verify Member API changes
4. Check documentation accuracy
5. Ensure CI/CD pipeline compatibility with workflow changes" \
  --label "infrastructure" \
  --label "deployment" \
  --label "api-update" \
  --label "documentation"

echo "Merge request created successfully. Please check your GitHub repository for the new pull request."
