# Modular Terraform Structure Workplan

## Current Structure
1. Workflows:
   - foundations.yml
   - databases.yml
   - app.yml

2. Terraform files:
   - shared_infrastructure.tf (contains VPC, security groups, and potentially ALB)
   - alb.tf (contains ALB-related resources)
   - neo4j.tf (contains Neo4j-specific resources)
   - main.tf (likely contains other main infrastructure components)

## Proposed Structure
1. Workflows (unchanged):
   - foundations.yml
   - databases.yml
   - app.yml

2. Terraform modules:
   a. shared_resources (new module):
      - main.tf (VPC, security groups, ALB)
      - variables.tf
      - outputs.tf

   b. neo4j (new module mostly from neo4j.tf):
      - main.tf
      - variables.tf
      - outputs.tf

   c. main (root module):
      - main.tf (calls shared_resources and neo4j modules, sets up other main infrastructure)
      - variables.tf
      - outputs.tf

## Implementation Steps

1. Create shared_resources module:
   - Create directory: terraform/shared_resources
   - Move relevant content from shared_infrastructure.tf and alb.tf to terraform/shared_resources/main.tf
   - Create terraform/shared_resources/variables.tf
   - Create terraform/shared_resources/outputs.tf

2. Create neo4j module:
   - Create directory terraform/neo4j
   - Update terraform/modules/neo4j/main.tf to use outputs from shared_resources module
   - Update terraform/neo4j/variables.tf if necessary
   - Update terraform/neo4j/outputs.tf if necessary

3. Create/update main module:
   - Update terraform/main.tf to call both shared_resources and neo4j modules
   - Update terraform/variables.tf
   - Update terraform/outputs.tf

4. Update workflow files:
   - Update .github/workflows/foundations.yml to use the main module
   - Update .github/workflows/databases.yml to use the main module
   - Update .github/workflows/app.yml to use the main module

5. Clean up:
   - Remove terraform/shared_infrastructure.tf
   - Remove terraform/alb.tf
   - Remove terraform/networking.tf (if it still exists)

6. Testing:
   - Run terraform init to ensure all modules are properly referenced
   - Run terraform plan to check for any configuration errors
   - Test each workflow to ensure they correctly deploy the infrastructure

7. Documentation:
   - Update README.md or create a new TERRAFORM.md to explain the new modular structure
   - Document any new variables or outputs in the module READMEs

## Benefits of this Structure
1. All workflows use the main module, which in turn uses the shared_resources and neo4j modules.
2. Clear separation of concerns between shared resources and specific components like Neo4j.
3. Easier management of dependencies and resource creation order.
4. Improved reusability and maintainability of Terraform code.
5. Simplified workflow files, as they only need to reference the main module.

## Considerations
- Ensure that the order of resource creation is maintained, especially for dependencies between shared resources and Neo4j.
- Be cautious of any hard-coded values or environment-specific configurations when modularizing.
- Consider using Terraform workspaces or separate state files for different environments if not already implemented.
