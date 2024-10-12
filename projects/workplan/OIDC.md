# Workplan: Implementing OIDC Authentication for AWS in GitHub Actions

## Current Situation
- AWS credentials are currently stored as GitHub secrets (AWS_ACCESS_KEY and AWS_SECRET_ACCESS_KEY).
- The wipe.yml workflow is experiencing authentication errors, possibly due to secret unavailability.

## Goal
Implement OpenID Connect (OIDC) authentication for AWS in our GitHub Actions workflows to enhance security and simplify credential management.

## Steps

1. Investigate Current Secret Availability
   - Review the wipe.yml workflow and verify secret usage.
   - Check GitHub repository settings to ensure secrets are properly set.
   - Temporarily add a step in the workflow to echo a masked version of the secrets to verify their presence.

2. Set Up OIDC Provider in AWS
   - Log in to the AWS Management Console.
   - Navigate to IAM > Identity Providers.
   - Create a new OpenID Connect provider.
   - Use https://token.actions.githubusercontent.com as the provider URL.
   - Add the audience: sts.amazonaws.com

3. Create IAM Role for GitHub Actions
   - In IAM, create a new role.
   - Select Web Identity as the trusted entity.
   - Choose the GitHub OIDC provider created in step 2.
   - Add a condition to limit access to our specific GitHub repository:
     token.actions.githubusercontent.com:sub: repo:Great-Sun-Group/credex-core:*
   - Attach necessary policies (e.g., permissions required for the wipe workflow).

4. Update GitHub Actions Workflow
   - Modify .github/workflows/wipe.yml to use OIDC authentication.
   - Replace the AWS credentials step with the following:
     ```yaml
     - name: Configure AWS Credentials
       uses: aws-actions/configure-aws-credentials@v2
       with:
         role-to-assume: arn:aws:iam::YOUR_AWS_ACCOUNT_ID:role/YOUR_GITHUB_ACTIONS_ROLE
         aws-region: ${{ env.TF_VAR_aws_region }}
     ```
   - Update other workflows (.github/workflows/create.yml, .github/workflows/redeploy.yml) similarly.

5. Test and Verify
   - Push changes to a test branch.
   - Run the updated wipe workflow manually using workflow_dispatch.
   - Monitor the workflow execution and AWS CloudTrail logs to verify successful authentication.

6. Documentation and Team Communication
   - Update internal documentation to reflect the new OIDC authentication method.
   - Communicate changes to the team, explaining benefits and any new procedures.

7. Clean Up
   - Once OIDC authentication is confirmed working, remove the old AWS_ACCESS_KEY and AWS_SECRET_ACCESS_KEY secrets from the GitHub repository.

8. Monitoring and Maintenance
   - Set up CloudTrail alerts for the new IAM role usage.
   - Establish a process for reviewing and updating the IAM role permissions as needed.

## Timeline
- Investigation and AWS Setup (Steps 1-3): 2 days
- Workflow Updates and Testing (Steps 4-5): 2 days
- Documentation and Team Communication (Step 6): 1 day
- Clean Up and Monitoring Setup (Steps 7-8): 1 day

Total Estimated Time: 6 working days

## Notes
- Ensure all team members with AWS access are involved in the OIDC setup process.
- Consider implementing OIDC authentication gradually, starting with non-critical workflows before updating the wipe workflow.
- Regularly review AWS permissions to ensure they adhere to the principle of least privilege.
