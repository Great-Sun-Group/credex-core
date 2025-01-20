# Neo4j Connection Issues Debug Report

## Issue
Unable to connect to Neo4j databases in the deployed `development` environment, with connection errors showing:
```
Failed to connect to server. Please ensure that your database is listening on the correct host and port and that you have compatible encryption settings both on Neo4j server and driver. Note that the default encryption setting has changed in Neo4j 4.0. Caused by: connect ECONNREFUSED 10.1.0.241:7687
```

## Investigation Steps & Findings

### 1. Infrastructure Check
- **VPC Configuration**:
  - Private subnets with NAT Gateways (nat-017726aebe1650213 and nat-08ddb012cc27dffc5)
  - S3 VPC endpoint exists (aws_vpc_endpoint.s3)
  - Proper security groups and routing tables configured

- **Neo4j Instances**:
  - LedgerSpace: i-08c2bc522af088f9c (10.1.0.241)
  - SearchSpace: i-03f8b6f1b612b02f8 (10.1.1.206)
  - Both instances are running but Neo4j service is not installed/running

### 2. Network Connectivity
- Instances have internet access (confirmed via ping and curl tests)
- Can reach yum.neo4j.com repository
- NAT Gateways are functioning correctly

#### NAT Gateway vs S3 Endpoint Behavior
While our tests show the instances can reach the internet through NAT Gateways, there's an important AWS networking behavior to consider:
- When an S3 VPC endpoint exists, AWS automatically routes all S3 requests through the endpoint instead of the NAT Gateway
- This happens even if the instance has internet access via NAT
- This explains why we can reach yum.neo4j.com via HTTPS but package installation fails
- The S3 endpoint policy is critical because:
  1. Yum first contacts the repository via HTTPS (works through NAT)
  2. Then tries to download packages from S3 (redirected to VPC endpoint)
  3. Without proper endpoint policy, these S3 requests fail

### 3. Installation Issues
- Neo4j service is not installed on the instances
- User data script from Terraform should handle installation but appears to be failing
- Yum repository configuration might be affected by S3 endpoint routing

## Key Findings

1. **Network Access**: Not a network connectivity issue as instances can reach the internet
2. **Service State**: Neo4j is not installed, indicating installation failure during instance launch
3. **Infrastructure**: All required infrastructure components exist but might need configuration adjustments

## Potential Solutions

### 1. S3 VPC Endpoint Configuration
- While an S3 VPC endpoint exists, it might need route table associations review
- Verify S3 endpoint policy allows access to yum repositories
- Consider adding specific routes for yum repository access

#### S3 Endpoint and Yum Repositories
The relationship between S3 and yum repositories is critical because:
- Many yum repositories, including Neo4j's, use S3 buckets to store their packages
- The S3 VPC endpoint can intercept and route S3 requests locally within AWS
- Without proper endpoint policies, these requests might fail or timeout

Current S3 endpoint lacks a policy allowing access to external yum repositories. Recommended policy:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowYumRepositoryAccess",
            "Effect": "Allow",
            "Principal": "*",
            "Action": [
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::yum.neo4j.com/*",
                "arn:aws:s3:::yum.neo4j.com"
            ]
        }
    ]
}
```

### 2. Instance Reinstallation
- Could terminate and recreate instances after fixing S3 endpoint configuration
- Modify user data script to include more error logging
- Add explicit checks for successful Neo4j installation

### 3. Manual Installation
- Could attempt manual installation after fixing S3 endpoint configuration
- Would provide more detailed error messages for troubleshooting
- Temporary solution to verify if S3 endpoint is the root cause

## Solution Implementation

After investigation, we recommend using the proper deployment workflow rather than direct terraform commands:

1. **Update S3 VPC Endpoint Configuration via Connectors Workflow**:
   - The S3 endpoint policy change should be deployed through the connectors workflow
   - This ensures proper infrastructure change management
   - Changes should be made in a PR and deployed via GitHub Actions

2. **Redeploy Neo4j Instances via Databases Workflow**:
   - Use the databases.yml workflow which is specifically designed for this purpose
   - The workflow already includes proper instance replacement flags:
     ```yaml
     terraform plan -target=module.databases -replace="module.databases.aws_instance.neo4j_ledger" -replace="module.databases.aws_instance.neo4j_search"
     ```
   - This ensures:
     * Clean instance recreation
     * Proper terraform state management
     * Consistent deployment process

## Previous Investigation Steps

1. **Review S3 VPC Endpoint Configuration**:
   ```hcl
   # Current configuration in terraform/modules/connectors/shared_resources/main.tf
   resource "aws_vpc_endpoint" "s3" {
     vpc_id            = aws_vpc.main.id
     service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
     vpc_endpoint_type = "Gateway"
     route_table_ids   = aws_route_table.private[*].id
   }
   ```
   - Verify route table associations
   - Consider adding specific endpoint policies for yum repository access
   - Review route table entries for S3 access

2. **S3 Endpoint Policy Update**:
   - Add the above S3 endpoint policy to allow yum repository access
   - Verify policy is applied correctly
   - Test S3 access from instances

3. **Enhance Installation Logging**:
   - Modify user data script to include more detailed logging
   - Add explicit verification steps for Neo4j installation
   - Consider adding CloudWatch log streaming for installation logs

3. **Infrastructure Validation**:
   - Verify all required security group rules
   - Confirm NAT Gateway configurations
   - Review instance IAM roles and permissions

4. **After S3 Configuration**:
   - Test manual Neo4j installation
   - If successful, update Terraform configuration
   - If still failing, collect detailed installation logs

## Long-term Recommendations

1. **Monitoring Improvements**:
   - Add CloudWatch metrics for Neo4j service status
   - Set up alerts for failed installations
   - Implement health checks for Neo4j connectivity

2. **Infrastructure Enhancements**:
   - Consider using AWS Systems Manager Parameter Store for configuration
   - Implement automatic recovery procedures
   - Add more detailed logging and monitoring

3. **Documentation Updates**:
   - Document troubleshooting steps
   - Update deployment procedures
   - Create runbook for Neo4j issues
