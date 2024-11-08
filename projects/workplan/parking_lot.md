# Task Parking Lot

Things that will be among next steps, in no particular order:

## 1. Enhance Deployment Process

### Implement Comprehensive Post-Deployment Verification
- Develop a suite of automated tests to run after each deployment
- Include both unit tests and integration tests
- Implement smoke tests to quickly verify critical functionality

### Add More Comprehensive Testing in CI/CD Pipeline
- Expand test coverage in the GitHub Actions workflows
- Implement static code analysis tools (e.g., ESLint, SonarQube)
- Add security scanning tools to the pipeline (e.g., OWASP ZAP, Snyk)

### Implement Blue-Green Deployments
- Set up infrastructure for blue-green deployments in ECS
- Update deployment scripts to support this deployment strategy
- This will allow for zero-downtime updates and easy rollbacks

### Set Up Automated Rollback Procedures
- Develop scripts to automate the rollback process
- Implement automatic rollback triggers based on health checks or error rates

## 2. Enhance Monitoring and Alerting

### Implement More Comprehensive Application Monitoring
- Set up application performance monitoring (APM) tools (e.g., New Relic, Datadog)
- Configure detailed dashboards for key application metrics

### Enhance Monitoring for Neo4j Instances
- Set up specific monitoring for Neo4j performance metrics
- Implement alerts for Neo4j-specific issues (e.g., low disk space, high memory usage)

### Implement Log Aggregation and Analysis
- Set up a centralized log management solution (e.g., ELK stack, Splunk)
- Develop log analysis dashboards for easier troubleshooting

## 3. Improve Infrastructure Management

### Optimize Resource Utilization
- Regularly review and optimize EC2 instance types and sizes
- Implement auto-scaling for ECS tasks based on load

### Enhance Disaster Recovery Capabilities
- Implement cross-region replication for critical data
- Develop and regularly test a comprehensive disaster recovery plan

## 4. Enhance Security Measures

### Implement a Secrets Rotation Policy
- Develop a process for regular rotation of all secrets and credentials
- Automate the secret rotation process where possible

### Set Up Monitoring and Alerting for Secrets Access
- Implement CloudTrail monitoring for access to sensitive resources
- Set up alerts for unusual patterns of secrets access

### Enhance Network Security
- Implement a Web Application Firewall (WAF) for additional protection
- Set up VPC Flow Logs analysis for network traffic monitoring

## 5. Improve Neo4j Management

### Implement Neo4j Clustering for High Availability
- Set up a Neo4j cluster in the production environment for improved reliability
- Update the application to work with a Neo4j cluster

### Implement Automated Backups for All Neo4j Instances
- Set up automated daily backups for all Neo4j instances
- Implement a backup retention and rotation policy

### Develop a Data Synchronization Strategy
- If required, implement a strategy for data synchronization between LedgerSpace and SearchSpace
- Consider using Neo4j's built-in replication features or custom ETL processes

## 6. Documentation and Knowledge Sharing

### Implement a Documentation Review Process
- Regularly review and update all deployment and infrastructure documentation
- Set up a process for developers to contribute to documentation improvements

### Develop Runbooks for Common Scenarios
- Create detailed runbooks for common operational tasks and incident responses
- Keep these runbooks up-to-date and easily accessible

### Implement Knowledge Sharing Sessions
- Organize regular sessions to share knowledge about the deployment process and infrastructure
- Encourage team members to present on new tools or techniques they've learned

By continuously focusing on these areas of improvement, you can enhance the reliability, efficiency, and security of the credex-core application's deployment process and infrastructure. Remember to prioritize these improvements based on their potential impact and the current needs of the project.


## 7. Neo4j License Validation Test Cases

### Objective
Ensure that the Neo4j Enterprise license is correctly applied and functioning across all environments (development, staging, and production). This has not been done yet.

### Test Cases

#### 1. License Application
- **Objective**: Verify that the Neo4j Enterprise license is correctly applied to all Neo4j instances.
- **Steps**:
  1. Deploy Neo4j instances in each environment.
  2. Connect to each Neo4j instance.
  3. Run the Cypher query: `CALL dbms.components() YIELD name, edition, version`.
  4. Verify that the 'edition' field shows 'enterprise' for all instances.

#### 2. Instance Count Compliance
- **Objective**: Ensure that the number of Neo4j instances complies with the license terms.
- **Steps**:
  1. Count the number of Neo4j instances in each environment.
  2. Verify that:
     - Production has no more than 3 instances.
     - Development has no more than 6 instances.
     - Staging (non-production testing) has no more than 3 instances.

#### 3. Resource Limits Compliance
- **Objective**: Confirm that each Neo4j instance respects the resource limits specified in the license.
- **Steps**:
  1. For each Neo4j instance, check the allocated resources:
     - CPU cores should not exceed 24.
     - RAM should not exceed 256 GB.
  2. Verify these limits in the instance specifications and Neo4j configuration.

#### 4. Enterprise Features Availability
- **Objective**: Validate that Enterprise-only features are available and functioning.
- **Steps**:
  1. Test a few Enterprise-only features, such as:
     - Multi-database support: Create and query a new database.
     - Advanced security: Set up role-based access control.
     - Causal clustering: If applicable, set up and test a causal cluster.

#### 5. License Expiration Handling
- **Objective**: Ensure proper handling of license expiration.
- **Steps**:
  1. Temporarily replace the valid license with an expired one.
  2. Attempt to start the Neo4j instance.
  3. Verify that appropriate warnings are logged.
  4. Confirm that the system handles the expired license gracefully (e.g., falls back to community edition or prevents startup, depending on configuration).

#### 6. License Renewal Process
- **Objective**: Validate the process for updating the license.
- **Steps**:
  1. Simulate a license renewal by updating the license secret in GitHub.
  2. Trigger a new deployment.
  3. Verify that the new license is correctly applied to all instances.

### Reporting
For each test case, document:
- Pass/Fail status
- Any errors or unexpected behavior
- Screenshots or logs where applicable

### Follow-up Actions
- Address any failed test cases.
- Update deployment scripts or configuration as necessary.
- Document any changes made to the system as a result of these tests.

## 8. DCO updateBalances for CXX and CXX multipliers
Needs to be updated to search for a flag that indicates nodes/rels to perform the updates on