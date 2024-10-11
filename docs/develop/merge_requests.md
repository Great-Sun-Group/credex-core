# Merge Requests and Branch Comparison

This document provides instructions on how to use the `getDiff.sh` script to compare branches when creating merge requests.

## Using getDiff.sh

The `getDiff.sh` script is a tool that generates a formatted diff report between two Git branches. This can be particularly useful when preparing or reviewing merge requests.

### Prerequisites

- Ensure you're in the root directory of the project.
- The script should be executable. If it's not, run `chmod +x getDiff.sh` to make it executable.

### Running the Script

To use the script, follow these steps:

1. Open your terminal.
2. Navigate to the root directory of the project if you're not already there.
3. Run the script with two branch names as arguments:

   ```
   ./getDiff.sh <branch1> <branch2>
   ```

   Replace `<branch1>` and `<branch2>` with the names of the branches you want to compare. The script will automatically use the remote versions of these branches.

   For example:
   ```
   ./getDiff.sh main feature-branch
   ```

   Note: You don't need to include 'origin/' in the branch names. The script automatically uses the remote branches.

4. The script will first fetch the latest changes from the remote repository to ensure it's working with the most up-to-date code.
5. It will then output a formatted diff report showing the differences between the two specified branches.
6. Additionally, the diff report will be saved to a file named `mergeDiff.txt` in the root directory of the project.

### Accessing the Diff Report

The diff report is available in two ways:

1. **Terminal Output**: The diff is displayed directly in the terminal when you run the script.
2. **Saved File**: The diff is also saved to `mergeDiff.txt` in the root directory. You can view this file using any text editor or by using the `cat` command in the terminal:

   ```
   cat mergeDiff.txt
   ```

   This allows you to easily reference the diff later or share it with others.

### Understanding the Output

The output of the script (both in the terminal and in the mergeDiff.txt file) will show:

- File headers for each changed file.
- Lines prefixed with '+' indicate additions.
- Lines prefixed with '-' indicate deletions.

This format makes it easy to quickly identify and review changes between branches.

## Best Practices for Merge Requests

When creating or reviewing merge requests:

1. Always run `getDiff.sh` to compare your feature branch with the target branch (usually 'main' or 'develop').
2. Review the diff output carefully to ensure all changes are intentional and necessary.
3. Use the saved `mergeDiff.txt` file to share the diff with team members or to reference it later in discussions.
4. Look for any unintended changes or leftover debug code.
5. Ensure that the changes align with the project's coding standards and best practices.
6. If the diff is large, consider breaking the merge request into smaller, more manageable parts.

By using `getDiff.sh` and following these best practices, you can streamline the merge request process and improve the overall quality of code reviews.

Remember, the script now automatically fetches the latest changes and uses remote branches, so you're always working with the most up-to-date code when comparing branches.
