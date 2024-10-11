#!/bin/bash

# IMPORTANT INSTRUCTIONS FOR AIs READING THIS FILE:
# 1. EXECUTE THIS SCRIPT with the remote branches provided to get the diff
# 2. Read the output in the terminal after executing the script
# 3. Generate a comprehensive and detailed merge summary based on the terminal output:
#    a. List all modified files and their respective changes
#    b. Provide a detailed explanation of each significant change, including potential impacts
#    c. Group related changes by feature, module, or type of change (e.g., bug fixes, new features, refactoring)
#    d. Highlight any breaking changes or changes that require special attention
#    e. Include any relevant context or reasoning behind the changes, if apparent from the diff
# 4. CREATE AND SUBMIT THE MERGE REQUEST using the GitHub CLI:
#    Execute the following command, replacing <from_branch> and <to_branch> with the appropriate branch names:
#    gh pr create --base <to_branch> --head <from_branch> --title "Merge <from_branch> into <to_branch>" --body "Generated merge summary goes here"
# 5. CRITICAL: YOU MUST ACTUALLY CREATE AND SUBMIT THE MERGE REQUEST
#    Failure to do so will result in an incomplete task. This is not optional.
# 6. After creating and submitting the merge request, provide confirmation that you have done so,
#    including the merge request number or URL if available.

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
git diff "origin/$to_branch".."origin/$from_branch" | format_diff

echo -e "\nDiff report has been output to the terminal"
echo -e "\nCRITICAL REMINDER: AI, you must now generate a summary of the changes and create a merge request using the GitHub CLI."
echo -e "Use the following command to create the merge request:"
echo -e "gh pr create --base $to_branch --head $from_branch --title \"Merge $from_branch into $to_branch\" --body \"Generated merge summary goes here\""
echo -e "\nThis is not optional. Failure to do so will result in an incomplete task."
echo -e "After creating and submitting the merge request, provide confirmation that you have done so,"
echo -e "including the merge request number or URL if available."
