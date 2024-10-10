#!/bin/bash

# Cleanup Orphaned Resources Script

set -e

# Ensure we're in the correct directory
cd "$(dirname "$0")"

# Initialize Terraform
terraform init

# Select the appropriate workspace
terraform workspace select ${TF_VAR_environment}

# Parse the TF_VAR_use_existing_resources JSON string
eval "$(echo "$TF_VAR_use_existing_resources" | jq -r 'to_entries | .[] | "USE_EXISTING_\(.key|ascii_upcase|gsub("-";"_"))=\(.value)"')"

# Function to get resources managed by Terraform
get_terraform_resources() {
    terraform show -json | jq -r '.values.root_module.resources[].values.id'
}

# Function to get all AWS resources with our project tag
get_aws_resources() {
    local resource_type=$1
    aws $resource_type describe-${resource_type}s --query "${resource_type}s[?Tags[?Key=='Project' && Value=='CredEx']].${resource_type}Id" --output text
}

# Function to identify orphaned resources
identify_orphaned_resources() {
    local resource_type=$1
    local tf_resources=$(get_terraform_resources)
    local aws_resources=$(get_aws_resources $resource_type)
    
    for resource in $aws_resources; do
        if ! echo "$tf_resources" | grep -q "$resource"; then
            echo "$resource"
        fi
    done
}

# Function to remove a resource
remove_resource() {
    local resource_type=$1
    local resource_id=$2
    aws $resource_type delete-${resource_type} --${resource_type}-id $resource_id
    echo "Removed $resource_type: $resource_id"
}

# Main cleanup process
cleanup() {
    local resource_type=$1
    local use_existing_var="USE_EXISTING_${resource_type^^}"
    use_existing_var=${use_existing_var//-/_}
    
    if [ "${!use_existing_var}" != "true" ]; then
        echo "Identifying orphaned $resource_type resources..."
        orphaned_resources=$(identify_orphaned_resources $resource_type)
        
        if [ -z "$orphaned_resources" ]; then
            echo "No orphaned $resource_type resources found."
        else
            echo "The following orphaned $resource_type resources were found:"
            echo "$orphaned_resources"
            
            read -p "Do you want to remove these resources? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                for resource in $orphaned_resources; do
                    remove_resource $resource_type $resource
                done
            else
                echo "Skipping removal of $resource_type resources."
            fi
        fi
    else
        echo "Skipping cleanup of $resource_type resources as they are marked as existing."
    fi
}

# Run cleanup for different resource types
cleanup "instance"
cleanup "security-group"
cleanup "vpc"
cleanup "subnet"
cleanup "load-balancer"
cleanup "ecs-cluster"
cleanup "ecs-service"

echo "Cleanup process completed."