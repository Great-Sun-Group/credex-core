## Neo4j License Management

We use a Neo4j Enterprise Startup Edition license with the following limitations:
- Up to 3 Machines for production use (24 Cores / 256 GB RAM each)
- Up to 6 Machines for development
- Up to 3 Machines for non-production internal testing (e.g., staging)

Our current allocation:
- Production: 2 instances (1 LedgerSpace, 1 SearchSpace)
- Staging: 2 instances (1 LedgerSpace, 1 SearchSpace)
- Development: 2 instances (1 LedgerSpace, 1 SearchSpace)

License management process:
1. The license is stored as a secret in GitHub Actions (`NEO4J_ENTERPRISE_LICENSE`).
2. During deployment, the license is retrieved and applied to Neo4j instances.
3. Instance counts and specifications are enforced through Terraform configurations in `terraform/neo4j.tf` and `terraform/variables.tf`.
4. Pre-deployment checks verify compliance with license limitations.
5. Regular audits are conducted to ensure ongoing compliance.

To update the license:
1. Obtain the new license file from Neo4j.
2. Update the `NEO4J_ENTERPRISE_LICENSE` secret in GitHub Environments.
3. Trigger a new deployment to apply the updated license.
