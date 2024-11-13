# Neo4j License Validation Test Cases

## Objective
Ensure that the Neo4j Enterprise license is correctly applied and functioning across all environments (development, staging, and production). This has not been done yet.

## Test Cases

### 1. License Application
- **Objective**: Verify that the Neo4j Enterprise license is correctly applied to all Neo4j instances.
- **Steps**:
  1. Deploy Neo4j instances in each environment.
  2. Connect to each Neo4j instance.
  3. Run the Cypher query: `CALL dbms.components() YIELD name, edition, version`.
  4. Verify that the 'edition' field shows 'enterprise' for all instances.

### 2. Instance Count Compliance
- **Objective**: Ensure that the number of Neo4j instances complies with the license terms.
- **Steps**:
  1. Count the number of Neo4j instances in each environment.
  2. Verify that:
     - Production has no more than 3 instances.
     - Development has no more than 6 instances.
     - Staging (non-production testing) has no more than 3 instances.

### 3. Resource Limits Compliance
- **Objective**: Confirm that each Neo4j instance respects the resource limits specified in the license.
- **Steps**:
  1. For each Neo4j instance, check the allocated resources:
     - CPU cores should not exceed 24.
     - RAM should not exceed 256 GB.
  2. Verify these limits in the instance specifications and Neo4j configuration.

### 4. Enterprise Features Availability
- **Objective**: Validate that Enterprise-only features are available and functioning.
- **Steps**:
  1. Test a few Enterprise-only features, such as:
     - Multi-database support: Create and query a new database.
     - Advanced security: Set up role-based access control.
     - Causal clustering: If applicable, set up and test a causal cluster.

### 5. License Expiration Handling
- **Objective**: Ensure proper handling of license expiration.
- **Steps**:
  1. Temporarily replace the valid license with an expired one.
  2. Attempt to start the Neo4j instance.
  3. Verify that appropriate warnings are logged.
  4. Confirm that the system handles the expired license gracefully (e.g., falls back to community edition or prevents startup, depending on configuration).

### 6. License Renewal Process
- **Objective**: Validate the process for updating the license.
- **Steps**:
  1. Simulate a license renewal by updating the license secret in GitHub.
  2. Trigger a new deployment.
  3. Verify that the new license is correctly applied to all instances.

## Reporting
For each test case, document:
- Pass/Fail status
- Any errors or unexpected behavior
- Screenshots or logs where applicable

## Follow-up Actions
- Address any failed test cases.
- Update deployment scripts or configuration as necessary.
- Document any changes made to the system as a result of these tests.