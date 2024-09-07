#!/bin/bash

# Define the output directory
output_dir="ai_context"
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

# Generate Git-based context
git_context_file="$output_dir/git_context.md"
echo "# Git Context" > "$git_context_file"
echo "## Recent Commits" >> "$git_context_file"
git log --oneline -n 5 >> "$git_context_file"
echo "" >> "$git_context_file"
echo "## Recent File Changes" >> "$git_context_file"
git diff --name-status HEAD~5 HEAD >> "$git_context_file"

# Include full content of up to 5 most recently changed files
recent_changes_file="$output_dir/recent_changes.md"
echo "# Recent Changes" > "$recent_changes_file"
git diff --name-only HEAD~5 HEAD | head -n 5 | while read -r file; do
    if [ -f "$file" ]; then
        echo "## $file" >> "$recent_changes_file"
        echo '```' >> "$recent_changes_file"
        cat "$file" >> "$recent_changes_file"
        echo '```' >> "$recent_changes_file"
        echo "" >> "$recent_changes_file"
    fi
done

echo "AI context updated in $output_dir"