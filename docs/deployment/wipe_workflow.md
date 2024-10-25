# Wipe AWS Resources Workflow

**Option to wipe `prod` must be removed before launch.**

This document provides an overview of the AWS resource wipe workflow, which is designed to delete all environment-specific AWS resources.

## Workflow Overview

The `.github/workflows/wipe_aws_resources.yml` file defines a GitHub Actions workflow for wiping AWS resources.

The AWS keys set in the Github Environments accessed by this workflow based on the branch selected are associated specific IAM permissions that are set outside of this Terraform infrastructure. The user login accessed by this script from the Github Environment will only have access to specific resources, all of which are intended to be deleted by this script.

Key aspects of this workflow include:

1. **Trigger**: The workflow is manually triggered (`workflow_dispatch`) with one input parameter:
   - `confirm_wipe`: Requires the user to type "YES" to confirm the deletion of all AWS resources in the environment for the current branch.

2. **Environment**: The workflow determines the environment (development, staging, or production) based on the Git branch. **Option to wipe `prod` must be removed before launch.**

3. **Steps**:
   - Checkout code
   - Set environment variables
   - Configure AWS credentials
   - Check AWS permissions
   - Wipe various AWS resources (detailed below)
   - Display a final message

## Resource Wiping Process

The workflow systematically deletes the following AWS resources:

1. **EC2 Resources**:
   - Terminates EC2 instances
   - Deletes EC2 key pairs

2. **VPC Resources**:
   - Deletes NAT Gateways
   - Releases Elastic IP addresses
   - Detaches and deletes Internet Gateways
   - Deletes Subnets
   - Deletes Route Tables
   - Deletes Network ACLs
   - Deletes Security Groups
   - Deletes Network Interfaces
   - Finally, deletes the VPC itself

3. **S3 Buckets**:
   - Empties and deletes all S3 buckets

4. **ECS Resources**:
   - Deletes ECS services and tasks
   - Deletes ECS clusters

5. **ECR Repositories**:
   - Deletes all ECR repositories

6. **CloudWatch Log Groups**:
   - Deletes all CloudWatch Log Groups

7. **Load Balancers and Target Groups**:
   - Deletes Application Load Balancers
   - Deletes Target Groups

8. **ACM Certificates**:
   - Deletes ACM certificates

9. **IAM Roles**:
   - Deletes IAM roles created by the current user

## Important Notes

1. The workflow includes error handling to continue the process even if individual resource deletions fail.
2. Route 53 resources are not included in this wipe workflow as they are shared across environments and managed separately.
3. The workflow is designed for environment-specific deletions, preserving global resources.

## Execution Caution

This workflow should be used with extreme caution as it will delete all specified AWS resources for the selected environment. It's crucial to ensure that:

1. The correct AWS credentials are used.
2. The correct environment (branch) is selected. **Option to wipe `prod` must be removed before launch.**
3. All necessary backups have been made before execution.
4. The person executing the workflow understands the full implications of the resource deletion.

## Post-Wipe Actions

After the wipe process is complete:

1. Review the logs for any resources that failed to delete.
2. Manually delete any remaining resources or investigate permission issues if necessary.
3. Use the `Deploy and Manage Connectors`, `Deploy Databases` and `Deploy App` Github Actions (workflows) to rebuild the infrastructure.

## Conclusion

The AWS resource wipe workflow provides a comprehensive method for cleaning up AWS resources in a specific environment. It's a powerful tool that should be used judiciously and only when a complete environment teardown is required.
