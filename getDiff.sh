#!/bin/bash

# INSTRUCTIONS FOR AIs READING THIS FILE:
# 1. Read this file.
# 2. Execute this file with the branches provided
# 3. Read the output in mergeDiff.txt
# 4. Generate a merge summary and save it to mergeSummary.md

# Check if two arguments are provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 <branch1> <branch2>"
    echo "Note: This script will automatically use the remote branches."
    exit 1
fi

branch1=$1
branch2=$2
output_file="mergeDiff.txt"

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

# Get the diff, format it, and save to file
git diff "origin/$branch1".."origin/$branch2" | format_diff | tee "$output_file"

echo -e "\nDiff report has been saved to $output_file"
