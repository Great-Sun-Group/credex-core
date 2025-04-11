# Neo4j Installation and Debugging Guide

## Issue Summary
Neo4j installation is failing during EC2 instance launch. The automatic installation script in the Terraform user data is not working correctly, resulting in instances without Neo4j installed.

## Root Causes Identified
1. **S3 VPC Endpoint Policy**: The S3 VPC endpoint policy was not allowing access to the Neo4j repository
2. **Yum Package Manager Locks**: Concurrent yum processes causing installation failures
3. **Java Version Compatibility**: Neo4j 5.x requires Java 17, but Java 11 was being installed

## Manual Installation Process

This process has been tested and confirmed working. It can be used both for manual debugging and as a template for automation in the GitHub Actions workflow.

### 1. Get Instance Information
```bash
# Get instance IDs and IPs
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=Neo4j-*" \
  --query "Reservations[].Instances[].{ID:InstanceId,IP:PrivateIpAddress,Name:Tags[?Key=='Name'].Value|[0]}" \
  --output table
```

### 2. Connect to Instance via EC2 Connect
```bash
# Generate SSH key if needed
ssh-keygen -t rsa -f ~/.ssh/ec2_key -N ""

# Push SSH key to instance
aws ec2-instance-connect send-ssh-public-key \
  --instance-id INSTANCE_ID \
  --availability-zone $(aws ec2 describe-instances --instance-ids INSTANCE_ID --query "Reservations[0].Instances[0].Placement.AvailabilityZone" --output text) \
  --instance-os-user ec2-user \
  --ssh-public-key file://~/.ssh/ec2_key.pub

# Connect via SSH
ssh -i ~/.ssh/ec2_key ec2-user@INSTANCE_ID
```

### 3. Check Current State
```bash
# Check if Neo4j is already installed
sudo systemctl status neo4j
rpm -q neo4j-enterprise

# Check for running processes
ps aux | grep yum
ps aux | grep neo4j

# Check system resources
free -m
df -h

# Check logs
sudo cat /var/log/neo4j-setup.log
```

### 4. Manual Installation Steps
```bash
# Accept Neo4j license agreement
sudo bash -c 'export NEO4J_ACCEPT_LICENSE_AGREEMENT=yes'

# Install Java 17
sudo yum install -y java-17-amazon-corretto

# Import Neo4j GPG key
sudo rpm --import https://debian.neo4j.com/neotechnology.gpg.key

# Configure Neo4j repository
sudo bash -c 'cat > /etc/yum.repos.d/neo4j.repo << EOF
[neo4j]
name=Neo4j RPM Repository
baseurl=https://yum.neo4j.com/stable/5
enabled=1
gpgcheck=1
EOF'

# Install Neo4j Enterprise
sudo yum install -y neo4j-enterprise

# Configure Neo4j
sudo bash -c 'echo "server.default_listen_address=0.0.0.0" >> /etc/neo4j/neo4j.conf'
sudo bash -c 'echo "server.bolt.listen_address=0.0.0.0:7687" >> /etc/neo4j/neo4j.conf'
sudo bash -c 'echo "server.http.listen_address=0.0.0.0:7474" >> /etc/neo4j/neo4j.conf'
sudo bash -c 'echo "server.https.listen_address=0.0.0.0:7473" >> /etc/neo4j/neo4j.conf'
sudo bash -c 'echo "dbms.security.auth_enabled=false" >> /etc/neo4j/neo4j.conf'

# Enable and start Neo4j service
sudo systemctl enable neo4j
sudo systemctl start neo4j
```

### 5. Verification
```bash
# Check Neo4j service status
sudo systemctl status neo4j

# Verify ports are open
sudo netstat -tlpn | grep neo4j

# Test connection with a simple query
cypher-shell --non-interactive "RETURN 1 AS test;"
```

## GitHub Actions Workflow Implementation

We've updated the GitHub Actions workflow (`databases.yml`) to incorporate these manual installation steps. The workflow now:

1. Deploys the EC2 instances via Terraform
2. Verifies if Neo4j is running after deployment
3. If Neo4j isn't running, performs the manual installation steps
4. Verifies the installation was successful

### Key Components of the Workflow:

```yaml
- name: Verify and Install Neo4j
  run: |
    # Get instance IDs and IPs
    LEDGER_ID=$(terraform output -raw neo4j_ledger_instance_id)
    SEARCH_ID=$(terraform output -raw neo4j_search_instance_id)
    
    # Function to install Neo4j
    install_neo4j() {
      local INSTANCE_ID=$1
      local SPACE_NAME=$2
      
      # Manual installation steps via SSM
      aws ssm send-command \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --parameters '{"commands":[
          "export NEO4J_ACCEPT_LICENSE_AGREEMENT=yes",
          "yum install -y java-17-amazon-corretto",
          "rpm --import https://debian.neo4j.com/neotechnology.gpg.key",
          "echo \"[neo4j]\\nname=Neo4j RPM Repository\\nbaseurl=https://yum.neo4j.com/stable/5\\nenabled=1\\ngpgcheck=1\" > /etc/yum.repos.d/neo4j.repo",
          "yum install -y neo4j-enterprise",
          "echo \"server.default_listen_address=0.0.0.0\" >> /etc/neo4j/neo4j.conf",
          "echo \"server.bolt.listen_address=0.0.0.0:7687\" >> /etc/neo4j/neo4j.conf",
          "echo \"server.http.listen_address=0.0.0.0:7474\" >> /etc/neo4j/neo4j.conf",
          "echo \"server.https.listen_address=0.0.0.0:7473\" >> /etc/neo4j/neo4j.conf",
          "echo \"dbms.security.auth_enabled=false\" >> /etc/neo4j/neo4j.conf",
          "systemctl enable neo4j",
          "systemctl start neo4j"
        ]}'
    }
    
    # Install Neo4j on both instances
    install_neo4j "$LEDGER_ID" "LedgerSpace"
    install_neo4j "$SEARCH_ID" "SearchSpace"
```

## Progress Update (April 11, 2025)

We've made significant progress in resolving the Neo4j installation issues:

1. **Removed Neo4j Installation from Terraform**:
   - Removed the Neo4j installation script from Terraform user data
   - Replaced it with a minimal initialization script that only sets up basic requirements
   - Removed the Neo4j installation script file from the Terraform files directory
   - Updated the S3 access policy to be more generic

2. **Enhanced GitHub Actions Workflow**:
   - Modified the installation commands to use our verified manual steps
   - Added the `-E` flag to the sudo command to properly pass the license agreement environment variable
   - Replaced `netstat` with `ss` for more reliable port verification
   - Added `cypher-shell` verification to ensure Neo4j is fully operational
   - Implemented a more comprehensive Neo4j configuration with explicit settings for:
     - Network configuration (listening addresses)
     - Security settings (auth disabled for testing)
     - Memory configuration (reduced for testing)
     - Connectivity settings (TLS disabled, routing enabled)

3. **Current Status**:
   - The workflow successfully deploys EC2 instances via Terraform
   - Neo4j installation via GitHub Actions is working
   - Still experiencing connectivity issues when testing with the Neo4j driver

## Next Steps

1. **Troubleshoot Connectivity Issues**:
   - Verify security group settings to ensure port 7687 is accessible
   - Check network ACLs and routing tables
   - Verify Neo4j is actually listening on the correct interfaces and ports
   - Consider direct SSH connection for more detailed diagnostics

2. **Implement EC2 Connect in Workflow**:
   - For more reliable installation, consider using EC2 Connect in the workflow instead of SSM
   - This would more closely match the manual process that works

3. **Monitoring and Alerting**:
   - Set up CloudWatch alarms for Neo4j service status
   - Create automated health checks for Neo4j connectivity

## Reference: S3 VPC Endpoint Policy

We've updated the S3 VPC endpoint policy to allow access to the Neo4j repository:

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
}
```
