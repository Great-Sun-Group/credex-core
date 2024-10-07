# GitHub App Deployment Process

This document outlines the streamlined deployment process using GitHub Apps and Environments for managing credentials and triggering deployments across development, staging, and production environments.

## Overview

The deployment process leverages separate GitHub Apps for each environment to manage secrets and trigger workflows. It also utilizes GitHub Environments to manage environment-specific secrets and variables. This approach improves security, provides granular access control, and maintains flexibility for future changes.

## Key Components

1. **GitHub Apps**: Three separate apps used for authentication and secrets management, one for each environment (development, staging, production).
2. **GitHub Environments**: Used to manage environment-specific secrets and variables.
3. **github-app-auth.js**: A script that interacts with the GitHub API to fetch secrets and trigger the development deployment workflow.
4. **Deployment Workflows**: Standardized GitHub Actions workflows for each environment (development, staging, production).

## Deployment Process

### Development
1. Developer sets `NODE_ENV` to "development".
2. The `github-app-auth.js` script is executed manually, which:
   - Authenticates with the development GitHub App
   - Fetches development-specific secrets from the Development environment
   - Triggers the development deployment workflow

### Staging and Production
- Deployments are triggered automatically by pushes to their respective branches (staging and main/master).
- The workflows use the appropriate GitHub App for authentication and retrieve secrets from the corresponding GitHub Environment.

## Setup Instructions

### For Developers

1. Install the necessary dependencies:
   ```
   npm install jsonwebtoken axios
   ```

2. Set up the following environment variables locally:
   - `GH_APP_ID`: The ID of the development GitHub App
   - `GH_INSTALLATION_ID`: The installation ID of the development GitHub App
   - `GH_APP_PRIVATE_KEY`: The private key of the development GitHub App

3. To deploy to development, run:
   ```
   NODE_ENV=development node .github/workflows/github-app-auth.js
   ```

### For DevOps/System Administrators

1. Create three GitHub Apps with the necessary permissions:
   - One for development
   - One for staging
   - One for production
   Each app should have:
   - Read access to secrets
   - Write access to workflows

2. Install the GitHub Apps on your repository

3. Create three GitHub Environments: Development, Staging, and Production

4. Store the following secrets in each GitHub Environment:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `GH_APP_ID`
   - `GH_INSTALLATION_ID`
   - `GH_APP_PRIVATE_KEY`
   - Any other environment-specific secrets

5. Update the deployment workflows:
   - `deploy-development.yml`: Triggered manually via `github-app-auth.js`
   - `deploy-staging.yml`: Triggered by pushes to the staging branch
   - `deploy-production.yml`: Triggered by pushes to the main/master branch

## Code Updates Required

1. Update `github-app-auth.js`:
   ```javascript
   const environment = process.env.NODE_ENV || 'development';
   const APP_ID = process.env.GH_APP_ID;
   const INSTALLATION_ID = process.env.GH_INSTALLATION_ID;
   const PRIVATE_KEY = process.env.GH_APP_PRIVATE_KEY;
   ```

2. Update `deploy-staging.yml` and `deploy-production.yml`:
   ```yaml
   name: Deploy to Staging # or Production
   
   on:
     push:
       branches: [staging] # or main/master for production

   jobs:
     deploy:
       runs-on: ubuntu-latest
       environment: Staging # or Production
       
       steps:
       - uses: actions/checkout@v2
       
       - name: Get GitHub App token
         id: get-token
         uses: getsentry/action-github-app-token@v2
         with:
           app_id: ${{ secrets.GH_APP_ID }}
           private_key: ${{ secrets.GH_APP_PRIVATE_KEY }}

       - name: Configure AWS credentials
         uses: aws-actions/configure-aws-credentials@v1
         with:
           aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
           aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
           aws-region: your-aws-region

       # Add other deployment steps here
   ```

3. Ensure all workflows use the correct environment:
   ```yaml
   jobs:
     deploy:
       runs-on: ubuntu-latest
       environment: Development # or Staging or Production
   ```

## Security Considerations

- Each GitHub App's private key should be kept secure and not shared.
- Regularly rotate the GitHub Apps' private keys and update them in the respective GitHub Environments.
- Use separate AWS accounts or IAM roles for each environment to maintain proper separation.
- Regularly audit and rotate AWS access keys and other secrets stored in GitHub Environments.
- Use environment protection rules for Staging and Production environments to require approvals before deployments.

## Troubleshooting

- If the deployment fails, check the GitHub Actions logs for detailed error messages.
- Ensure that each GitHub App has the necessary permissions to read secrets and trigger workflows for its respective environment.
- Verify that all required secrets are properly set in the corresponding GitHub Environment.

## Future Improvements

- Implement a rollback mechanism in case of failed deployments.
- Add more detailed logging and error reporting in the `github-app-auth.js` script.
- Create a CLI wrapper around the script to provide a more user-friendly interface for developers.

By following this process, we maintain consistency across environments, improve security through granular access control and environment-specific secrets, and simplify the developer experience for deploying to different environments.