#!/bin/bash

# Define the output file
output_file="src/tests/combined_code.txt"

# Get the current branch name
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Clear the existing content of the output file
> "$output_file"

# Add the current branch information
echo "Current Branch: $current_branch" >> "$output_file"
echo "----------------------------------------" >> "$output_file"

# Find all files with extensions .ts, .js, .json, .yaml, .yml, .md, and .sh
# Include the specified directories: src, middleware, config, build, .devcontainer, .githooks, .github
# Exclude node_modules directory and .git directory
find src middleware config build .devcontainer .githooks .github -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.md" -o -name "*.sh" \) -not -path "*/node_modules/*" -not -path "*/.git/*" | while read -r file; do
    echo "File: $file" >> "$output_file"
    echo "----------------------------------------" >> "$output_file"
    cat "$file" >> "$output_file"
    echo -e "\n\n" >> "$output_file"
done

echo "Combined source code file updated: $output_file for branch: $current_branch"