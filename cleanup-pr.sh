#!/bin/bash

# First, create a backup branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
backup_branch="${current_branch}-backup-$(date +%Y%m%d_%H%M%S)"
echo "Creating backup branch: $backup_branch"
git branch $backup_branch

echo "Fetching latest changes from remote..."
git fetch origin dev

echo "Rebasing current branch onto dev..."
git rebase origin/dev

if [ $? -ne 0 ]; then
    echo "Rebase encountered conflicts. Please resolve them and run 'git rebase --continue'"
    echo "To abort the rebase and try again later, run 'git rebase --abort'"
    echo "Your work is safely backed up in branch: $backup_branch"
    exit 1
fi

echo "Fetching files from PR..."
gh pr view --json files -q '.files[].path' > all_files.txt

# Create a temporary file to store files to reset
touch files_to_reset.txt

echo "Analyzing files for empty changes..."
while IFS= read -r file; do
    # Skip if file doesn't exist (might have been deleted)
    if [ ! -f "$file" ]; then
        continue
    fi
    
    # Check if file is empty or has no real changes
    if [ ! -s "$file" ] || [ -z "$(git diff origin/dev..HEAD -- "$file" | grep -v '^[-+]$' | grep '^[-+]')" ]; then
        echo "$file" >> files_to_reset.txt
    fi
done < all_files.txt

# Show preview of files to be reset
echo -e "\nFiles that will be reset (empty or no real changes):"
cat files_to_reset.txt

# Show recovery instructions
echo -e "\nRECOVERY INSTRUCTIONS:"
echo "1. Your current work is safely backed up in branch: $backup_branch"
echo "2. If anything goes wrong, you can recover using:"
echo "   git checkout $backup_branch"
echo "3. The original commit is also preserved in the reflog for 30 days:"
echo "   git reflog show $current_branch"
echo "   git reset --hard $current_branch@{1}  # to go back one step"

# Ask for confirmation
echo -e "\nDo you want to proceed with resetting these files? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "Resetting files..."
    while IFS= read -r file; do
        git checkout origin/dev -- "$file"
    done < files_to_reset.txt
    
    echo "Committing changes..."
    git add .
    git commit --amend --no-edit
    
    echo "Force pushing changes to $current_branch..."
    git push -f origin "$current_branch"
    
    echo -e "\nDone! Your PR has been cleaned up and rebased onto dev."
    echo "Remember: Your original work is preserved in branch: $backup_branch"
else
    echo "Operation cancelled."
fi

# Cleanup temporary files
rm all_files.txt files_to_reset.txt

echo -e "\nYou can now check your PR on GitHub to verify the changes."
