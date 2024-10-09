#!/bin/bash

# Terraform Workspace Management Script

set -e

# Ensure we're in the correct directory
cd "$(dirname "$0")"

# Initialize Terraform
terraform init

# Function to create a workspace if it doesn't exist
create_workspace_if_not_exists() {
    local workspace=$1
    if ! terraform workspace list | grep -q " $workspace$"; then
        echo "Creating workspace: $workspace"
        terraform workspace new "$workspace"
    else
        echo "Workspace $workspace already exists"
    fi
}

# Create workspaces for all environments
create_workspace_if_not_exists "development"
create_workspace_if_not_exists "staging"
create_workspace_if_not_exists "production"

# List all workspaces
echo "Available workspaces:"
terraform workspace list

# Select the workspace based on the environment variable
if [ -n "$TF_VAR_environment" ]; then
    echo "Selecting workspace: $TF_VAR_environment"
    terraform workspace select "$TF_VAR_environment"
else
    echo "Error: TF_VAR_environment is not set. Please set it to 'development', 'staging', or 'production'."
    exit 1
fi

echo "Current workspace: $(terraform workspace show)"