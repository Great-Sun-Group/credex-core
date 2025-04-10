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

## Solution Implemented

We've updated the S3 VPC endpoint policy in `terraform/modules/connectors/shared_resources/main.tf` to explicitly allow access to the Neo4j repository:

```hcl
resource "aws_vpc_endpoint" "s3" {
  # ... existing configuration ...
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowYumRepositoryAccess"
        Effect    = "Allow"
        Principal = "*"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::yum.neo4j.com/*",
          "arn:aws:s3:::yum.neo4j.com"
        ]
      },
      {
        Sid       = "AllowAllS3Access"
        Effect    = "Allow"
        Principal = "*"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          "arn:aws:s3:::*",
          "arn:aws:s3:::*/*"
        ]
      }
    ]
  })
  # ... rest of configuration ...
}
```

This policy now explicitly allows access to the Neo4j repository (`yum.neo4j.com`), which is needed during the installation process. This ensures that when the EC2 instances try to download Neo4j packages from S3, the requests are properly allowed through the VPC endpoint.

## Deployment Steps

To complete the fix, follow these steps:

1. **Deploy the Connectors Module First**:
   - This will update the S3 VPC endpoint policy
   - Run the connectors workflow in GitHub Actions or use Terraform directly:
     ```bash
     cd terraform
     terraform init
     terraform apply -target=module.connectors
     ```

2. **Redeploy the Neo4j Instances**:
   - After the connectors module is updated, redeploy the Neo4j instances
   - Run the databases workflow in GitHub Actions or use Terraform directly:
     ```bash
     cd terraform
     terraform init
     terraform apply -target=module.databases -replace="module.databases.aws_instance.neo4j_ledger" -replace="module.databases.aws_instance.neo4j_search"
     ```

3. **Verify the Deployment**:
   - Check that the Neo4j instances are running
   - Verify that the Neo4j service is installed and running on the instances
   - Test the application's connection to the databases

4. **Update Environment Variables**:
   - After successful deployment, you may need to update the following environment variables:
     - `NEO_4J_LEDGER_SPACE_BOLT_URL`
     - `NEO_4J_SEARCH_SPACE_BOLT_URL`

## Monitoring and Verification

After deployment, you can verify the fix by:

1. SSH into one of the Neo4j instances and check if Neo4j is installed:
   ```bash
   systemctl status neo4j
   ```

2. Check the installation logs for any errors:
   ```bash
   cat /var/log/neo4j-setup.log
   ```

3. Verify that the application can connect to the databases by checking the application logs.

## Improvements Implemented

We've made several improvements to prevent similar issues in the future:

### 1. Enhanced GitHub Workflow

We've added a robust verification step to the GitHub workflow:

- **Added Neo4j Service Verification Step**:
  - The workflow now uses AWS Systems Manager (SSM) to run commands on the instances
  - Verifies that Neo4j is installed and running by checking:
    - Service status (`systemctl status neo4j`)
    - Package installation (`rpm -q neo4j-enterprise`)
    - Open ports (`netstat -tlpn | grep neo4j`)
  - If verification fails, the workflow will:
    - Report detailed error information
    - Display the Neo4j installation logs
    - Fail the deployment

- **Benefits**:
  - Early detection of installation failures
  - Detailed error reporting for faster troubleshooting
  - Prevents false "success" reports when only the EC2 instances are running but Neo4j isn't installed

### 2. Improved User Data Script

We've enhanced the EC2 instance user data script to better detect and report S3 endpoint issues:

- **Early CloudWatch Integration**:
  - Installs and configures CloudWatch agent at the beginning of the script
  - Sends installation status metrics to CloudWatch
  - Logs to instance console output for easier debugging

- **S3 Connectivity Testing**:
  - Explicitly tests S3 connectivity to the Neo4j repository
  - Performs diagnostic tests if connectivity issues are detected
  - Logs detailed information about S3 endpoint configuration

- **Enhanced Error Handling**:
  - More detailed error reporting at each critical step
  - Specific checks for repository configuration
  - Network connectivity tests when installation fails
  - Explicit testing of S3 endpoint access

- **Benefits**:
  - Catches S3 endpoint policy issues early in the installation process
  - Provides clear diagnostic information about the specific failure point
  - Makes silent failures visible through multiple logging channels

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
