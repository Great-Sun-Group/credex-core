#!/bin/bash

# INSTRUCTIONS FOR AIs READING THIS FILE:
# 1. Execute this file with the remote branches provided
# 2. Read the output in the terminal
# 3. Generate a comprehensive and detailed merge summary based on the terminal output:
#    a. List all modified files and their respective changes
#    b. Provide a detailed explanation of each significant change, including potential impacts
#    c. Group related changes by feature, module, or type of change (e.g., bug fixes, new features, refactoring)
#    d. Highlight any breaking changes or changes that require special attention
#    e. Include any relevant context or reasoning behind the changes, if apparent from the diff
# 4. Create and submit a merge request:
#    a. Use an appropriate title that summarizes the main purpose of the changes
#    b. Include the detailed merge summary in the body of the merge request
#    c. Add any necessary labels or assignees based on the nature of the changes
#    d. If applicable, mention related issues or pull requests
#    e. Provide any additional instructions for reviewers, such as specific areas to focus on

# Check if two arguments are provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 <from_branch> <to_branch>"
    echo "Note: This script will automatically use the remote branches."
    exit 1
fi

from_branch=$1
to_branch=$2

# Fetch the latest changes from the remote repository
git fetch origin

# Function to format the diff output
format_diff() {
    local in_file_block=false
    local file_header=""

    while IFS= read -r line; do
        if [[ $line == diff* ]]; then
            in_file_block=true
            file_header="\n$line\n$(printf '=%.0s' {1..${#line}})\n"
        elif [[ $line == +++* || $line == ---* ]]; then
            continue
        elif [[ $line == +* || $line == -* ]] && $in_file_block; then
            echo -e "$file_header$line"
            file_header=""
            in_file_block=false
        fi
    done
}

# Get the diff, format it, and output to terminal
git diff "origin/$from_branch".."origin/$to_branch" | format_diff

echo -e "\nDiff report has been output to the terminal"
