# Connectors Update Workplan

## Overview

This workplan outlines the steps to update the connectors infrastructure using Terraform. The approach includes options for creating, updating, and importing resources, with a focus on bringing existing resources under Terraform management and ensuring all infrastructure is up to date with current configurations.

## Steps

### 1. Update GitHub Actions Workflow

Update the `.github/workflows/connectors.yml` file to include the following options:

- create: Create new resources
- update: Update existing resources
- import: Import existing resources into Terraform state

### 2. Implement Import Functionality

Add a step in the workflow to import known existing resources:

- CloudWatch Log Group: `/ecs/credex-core-{environment}`
- IAM Roles: 
  - `ecs-execution-role-{environment}`
  - `ecs-task-role-{environment}`

No additional inputs should be required for the import process, and when the workflow is triggered with that option, it should just execute the action necessary to do the import, with no creates or updates.

### 3. Run Import Workflow

Push the changes and run the workflow with the `import` option to update Terraform state with existing resources.

### 4. Remove Import Functionality

After successful import, remove the import functionality from the workflow to prevent accidental reimports.

### 5. Update All Infrastructure

Run the workflow with `update=all` to ensure all infrastructure is up to date with current code configurations.

## Detailed Component List

Ensure the workflow can handle creation and update for each of the following components:

1. VPC
2. Subnets (Public and Private)
3. Internet Gateway
4. NAT Gateways
5. Route Tables
6. Security Groups
7. ECR Repository
8. ECS Cluster
9. ECS Task Definition
10. ECS Service
11. CloudWatch Log Group
12. IAM Roles (ECS Execution and Task roles)
13. Application Load Balancer
14. ALB Target Group
15. ALB Listeners
16. EC2 Key Pair
17. Neo4j Instances
18. Neo4j Security Group
19. ACM Certificate

Ensure the workflow can (temporarily) also handle import for these components:

11. CloudWatch Log Group
12. IAM Roles (ECS Execution and Task roles)


## Implementation Details

### Workflow Input

Add the following inputs to the workflow:

```yaml
on:
  workflow_dispatch:
    inputs:
      action:
        description: 'Action to perform (create/update/import)'
        required: true
        default: 'update'
      component:
        description: 'Component to manage (all/vpc/subnets/igw/nat/routes/sg/ecr/ecs/logs/iam/alb/keypair/neo4j/acm)'
        required: true
        default: 'all'
```

### Terraform Variables

Ensure the following variables are available in your Terraform configuration:

```hcl
variable "create_vpc" { type = bool, default = true }
variable "create_subnets" { type = bool, default = true }
variable "create_igw" { type = bool, default = true }
variable "create_nat" { type = bool, default = true }
variable "create_routes" { type = bool, default = true }
variable "create_sg" { type = bool, default = true }
variable "create_ecr" { type = bool, default = true }
variable "create_ecs" { type = bool, default = true }
variable "create_logs" { type = bool, default = true }
variable "create_iam" { type = bool, default = true }
variable "create_alb" { type = bool, default = true }
variable "create_keypair" { type = bool, default = true }
variable "create_neo4j" { type = bool, default = true }
variable "create_acm" { type = bool, default = true }
```

### Workflow Logic

1. Set all `create_*` variables to `false` by default.
2. Based on the `component` input, set the corresponding `create_*` variable(s) to `true`.
3. If `action` is `create`, proceed with creation using the set variables.
4. If `action` is `update`, first check if the resources exist, then update as necessary.
5. If `action` is `import`, perform the import for the specified component(s).

### Import Logic

Implement the import logic temporarily as part of the workflow. Example for CloudWatch Log Group:

```bash
if [[ "${{ github.event.inputs.action }}" == "import" && "${{ github.event.inputs.component }}" == "logs" ]]; then
  terraform import module.app.aws_cloudwatch_log_group.ecs_logs[0] /ecs/credex-core-${{ env.ENVIRONMENT }}
fi
```

Repeat similar logic for each importable resource.

## Conclusion

This workplan provides a structured approach to managing the connectors infrastructure. By following these steps, you'll be able to import existing resources, ensure all components are up to date, and have granular control over the creation and updating of individual components.
