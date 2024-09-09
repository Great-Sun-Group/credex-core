#!/bin/bash

# Define the output directory as the docs directory
output_dir="docs"

# Ensure the docs directory exists
mkdir -p "$output_dir"

# Get the current branch name
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Create main summary file
summary_file="$output_dir/code_summary.md"
echo "# Code Summary" > "$summary_file"
echo "Current Branch: $current_branch" >> "$summary_file"
echo "" >> "$summary_file"

# Function to generate a summary of a file
generate_summary() {
    local file="$1"
    
    echo "Summarizing $file"
    
    echo "## $file" >> "$summary_file"
    echo '```' >> "$summary_file"
    
    # Extract function and class definitions
    grep -E "^(export )?(async )?(function|class|interface|type|const|let|var)" "$file" >> "$summary_file"
    
    # Extract comments
    grep -E "^(\s*\/\/|\s*\/\*|\s*\*)" "$file" >> "$summary_file"
    
    echo '```' >> "$summary_file"
    echo "" >> "$summary_file"
}

# Find all relevant files
find src middleware config build .devcontainer .githooks .github -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.md" -o -name "*.sh" \) -not -path "*/node_modules/*" -not -path "*/.git/*" | while read -r file; do
    generate_summary "$file"
done

echo "Code summary updated in $summary_file"