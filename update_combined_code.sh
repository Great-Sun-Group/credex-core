#!/bin/bash

# Define the output directory
output_dir="ai_context"
mkdir -p "$output_dir"

# Get the current branch name
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Create subdirectories
mkdir -p "$output_dir/summaries"
mkdir -p "$output_dir/recent_changes"

# Create index file
index_file="$output_dir/index.md"
echo "# Code Index" > "$index_file"
echo "Current Branch: $current_branch" >> "$index_file"
echo "" >> "$index_file"

# Function to generate a summary of a file
generate_summary() {
    local file="$1"
    local summary_file="$output_dir/summaries/${file//\//_}.summary"
    
    echo "Summarizing $file"
    
    # Extract function and class definitions
    grep -E "^(export )?(async )?(function|class|interface|type|const|let|var)" "$file" > "$summary_file"
    
    # Extract comments
    grep -E "^(\s*\/\/|\s*\/\*|\s*\*)" "$file" >> "$summary_file"
    
    # Add file path to index
    echo "- [$file](summaries/${file//\//_}.summary)" >> "$index_file"
}

# Find all relevant files
find src middleware config build .devcontainer .githooks .github -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.md" -o -name "*.sh" \) -not -path "*/node_modules/*" -not -path "*/.git/*" | while read -r file; do
    generate_summary "$file"
    
    # Check if file was changed in the last 5 commits
    if git diff --name-only HEAD~5 HEAD | grep -q "$file"; then
        echo "Including recent changes for $file"
        cp "$file" "$output_dir/recent_changes/"
    fi
done

# Generate Git-based context
git_context_file="$output_dir/git_context.md"
echo "# Git Context" > "$git_context_file"
echo "## Recent Commits" >> "$git_context_file"
git log --oneline -n 5 >> "$git_context_file"
echo "" >> "$git_context_file"
echo "## Recent File Changes" >> "$git_context_file"
git diff --name-status HEAD~5 HEAD >> "$git_context_file"

echo "AI context updated in $output_dir"