# Neo4j Secrets Management Workplan

## Objective
Implement an automated, secure process for managing Neo4j connection details (bolt URL, username, password) using AWS Secrets Manager for production and staging environments, while maintaining the ability to use environment variables for local development.

## Implementation Steps

### 1. Update Terraform Configuration

a. Add AWS Secrets Manager resources to store Neo4j connection details:

```hcl
resource "aws_secretsmanager_secret" "neo4j_prod_secrets" {
  name = "neo4j_prod_secrets"
}

resource "aws_secretsmanager_secret_version" "neo4j_prod_secrets" {
  secret_id = aws_secretsmanager_secret.neo4j_prod_secrets.id
  secret_string = jsonencode({
    ledgerspacebolturl = "bolt://${aws_instance.neo4j_prod_ledger.public_ip}:7687"
    ledgerspaceuser = "neo4j"
    ledgerspacepass = var.prod_neo4j_ledger_space_pass
    searchspacebolturl = "bolt://${aws_instance.neo4j_prod_search.public_ip}:7687"
    searchspaceuser = "neo4j"
    searchspacepass = var.prod_neo4j_search_space_pass
  })
}

# Create similar resources for staging environment
```

### 2. Update Application Configuration

a. Install the AWS SDK v3 for Secrets Manager:
```
npm install @aws-sdk/client-secrets-manager
```

b. Update the `config/config.ts` file to use AWS Secrets Manager for production and staging environments, while still using environment variables for development.

### 3. Update GitHub Actions Workflow

Modify the GitHub Actions workflow to set the `NODE_ENV` environment variable:

```yaml
- name: Set environment variables
  run: |
    echo "NODE_ENV=production" >> $GITHUB_ENV  # or staging for staging deployments
```

### 4. Update Application Code

a. Modify the application entry point (e.g., `src/index.ts`) to use the new asynchronous configuration:

```typescript
import { getConfig } from './config/config';

async function startApp() {
  const config = await getConfig();
  // Initialize your application with the config
}

startApp().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
```

b. Update any other parts of the application that import the config directly to use the asynchronous `getConfig` function.

## Benefits

1. **Improved Security**: Sensitive information is stored and managed in AWS Secrets Manager for production and staging environments.
2. **Flexibility**: Developers can still use local environment variables for development.
3. **Automation**: The process of updating Neo4j connection details is fully automated through Terraform for production and staging.
4. **Simplification**: Eliminates the need to manage multiple sets of environment variables for different environments.
5. **IaC Alignment**: The entire process is managed through code (Terraform and application config), adhering to IaC principles.

## Implementation Plan

1. Implement the Terraform changes to create and manage AWS Secrets Manager resources.
2. Update the application configuration as described in step 2.
3. Modify the GitHub Actions workflow to set the correct `NODE_ENV`.
4. Update the application code to use the new asynchronous configuration.
5. Test the new setup in a staging environment to ensure all components work together correctly.
6. Roll out the changes to the production environment.
7. Update documentation to reflect the new secrets management process.

## Monitoring and Maintenance

- Regularly audit AWS Secrets Manager access logs to ensure proper usage.
- Set up alerts for any unauthorized access attempts to the Neo4j secrets.
- Implement a rotation policy for the Neo4j passwords and update the Terraform code accordingly.
- Ensure that developers understand how to set up their local environment variables for development.

By implementing this plan, we'll have a more secure, automated, and IaC-aligned process for managing Neo4j connection details in our deployment pipeline, while maintaining ease of use for local development.