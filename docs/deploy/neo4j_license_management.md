# Neo4j License Management

## Overview

This document outlines the process for managing Neo4j Enterprise licenses across our development, staging, and production environments.

## License Details

- **License Type**: Neo4j Enterprise Startup Edition
- **Limitations**:
  - Up to 3 Machines for production use (24 Cores / 256 GB RAM each)
  - Up to 6 Machines for development
  - Up to 3 Machines for non-production internal testing (e.g., staging)

## License Allocation

- **Production**: 2 instances (1 ledger, 1 search)
- **Staging**: 1 instance (combined ledger and search)
- **Development**: Up to 6 instances as needed

## License Management Process

### 1. Storing the License

The Neo4j Enterprise license is stored as a secret in GitHub Actions, named `NEO4J_ENTERPRISE_LICENSE`. This secret contains the plain text content of the license file.

### 2. Applying the License

The license is applied during the deployment process:

1. The GitHub Actions workflow retrieves the license from the secret.
2. The license is passed to Terraform as a variable.
3. Terraform applies the license to the Neo4j instances during provisioning.

### 3. Updating the License

To update the license:

1. Obtain the new license file from Neo4j.
2. Update the `NEO4J_ENTERPRISE_LICENSE` secret in GitHub Environments (all 3) with the new license content.
3. Trigger a new deployment to apply the updated license.

### 4. Monitoring License Status

- Regular checks should be performed to ensure license compliance.
- Set up alerts for license expiration (details in the monitoring section).

### 5. License Renewal

- Track the license expiration date.
- Initiate the renewal process with Neo4j at least 30 days before expiration.
- Once renewed, follow the "Updating the License" process.

## Compliance Checks

Refer to `docs/testing/neo4j_license_validation.md` for detailed test cases to ensure license compliance.

## Troubleshooting

If issues arise with the Neo4j license:

1. Verify the license is correctly stored in GitHub secrets.
2. Check deployment logs for any errors related to license application.
3. Connect to a Neo4j instance and run `CALL dbms.components() YIELD name, edition, version` to verify the enterprise edition is active.
4. If problems persist, contact Neo4j support.

## Related Documentation

- Neo4j Enterprise Edition Features: [Neo4j Documentation](https://neo4j.com/docs/operations-manual/current/introduction/#edition)
- Terraform Configuration: `terraform/neo4j.tf`
- Deployment Workflow: `.github/workflows/deploy-development.yml`

Remember to keep this document updated with any changes to the license management process or Neo4j deployment configuration.# Neo4j License Management