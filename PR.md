# Add Firebase Configuration for Push Notifications

## Description
This PR adds Firebase configuration support to enable push notifications in the application. The changes include adding Firebase credentials as environment variables and updating the infrastructure configuration to support Firebase integration.

## Changes Made

### 1. GitHub Workflow (.github/workflows/app.yml)
- Added Firebase environment variables to Terraform plan step:
  - FIREBASE_PROJECT_ID
  - FIREBASE_CLIENT_EMAIL
  - FIREBASE_PRIVATE_KEY
- Added Firebase environment variables to ECS task definition

### 2. Terraform App Module (terraform/app.tf)
- Added Firebase configuration variables to app module:
  - firebase_project_id
  - firebase_client_email
  - firebase_private_key

### 3. App Module Variables (terraform/modules/app/variables.tf)
- Added new Firebase variables with appropriate descriptions and sensitivity flags:
  - firebase_project_id (string, sensitive)
  - firebase_client_email (string, sensitive)
  - firebase_private_key (string, sensitive)

### 4. Root Variables (terraform/variables.tf)
- Added corresponding Firebase variables at the root level

## Required Setup

After merging this PR, you need to:

1. Get Firebase service account credentials:
   - Go to Firebase Console > Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - This will download a JSON file containing the credentials

2. Add these values as secrets in your GitHub Environment:
   - FIREBASE_PROJECT_ID (from project_id in JSON)
   - FIREBASE_CLIENT_EMAIL (from client_email in JSON)
   - FIREBASE_PRIVATE_KEY (from private_key in JSON)

3. Run the "Deploy Application" GitHub Action to deploy with the new configuration

## Testing
- Verify that the NotificationService initializes properly
- Test push notification functionality using the test endpoints
- Monitor ECS task logs for any Firebase-related issues

## Security Considerations
- All Firebase credentials are marked as sensitive in Terraform
- Credentials are stored as GitHub Environment secrets
- Variables are properly passed through secure environment variables in ECS tasks
