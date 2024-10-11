#!/bin/bash

set -e

# Function to echo with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check if two arguments are provided
if [ $# -ne 2 ]; then
    log "Usage: $0 <from_branch> <to_branch>"
    log "Note: This script will automatically use the remote branches."
    exit 1
fi

from_branch=$1
to_branch=$2

# Debug: Print the branch names
log "From branch: $from_branch"
log "To branch: $to_branch"

# Fetch the latest changes from the remote repository
log "Fetching latest changes..."
timeout 60s git fetch origin || { log "Fetch timed out after 60 seconds"; exit 1; }
log "Fetch completed."

# Debug: List remote branches
log "Listing remote branches:"
git --no-pager branch -r

# Get list of changed files
log "Getting list of changed files..."
changed_files=$(git --no-pager diff --name-only "origin/$to_branch".."origin/$from_branch")
log "Changed files:"
echo "$changed_files"

# Function to get diff for a single file
get_file_diff() {
    local file=$1
    log "Getting diff for file: $file"
    git --no-pager diff -U3 --color=always --ignore-all-space --ignore-blank-lines "origin/$to_branch".."origin/$from_branch" -- "$file"
}

# Process each changed file
for file in $changed_files; do
    log "Processing file: $file"
    diff_output=$(get_file_diff "$file")
    echo "$diff_output"
    echo "----------------------------------------"
done

log "Diff process completed."
log "CRITICAL REMINDER: AI, you must now generate a summary of the changes and create a merge request using the GitHub CLI."
log "Use the following command to create the merge request:"
log "gh pr create --base $to_branch --head $from_branch --title \"Merge $from_branch into $to_branch\" --body \"Generated merge summary goes here\""
log "This is not optional. Failure to do so will result in an incomplete task."
log "After creating and submitting the merge request, provide confirmation that you have done so,"
log "including the merge request URL."
