# Revised Terraform Refactor Workplan

We are partway through a terraform restructure, and things have gotten a little messy. We have analyzed the current situation and recommend the workplan solution below.

## Background and End State

**content here about the three workflows:
1. Basic resource setup (once to set up each environment, then very infrequent)
   - This workflow, implemented in connectors.yml, is responsible for setting up the foundational infrastructure.
   - It includes creating VPCs, subnets, security groups, and other core networking components.
   - Runs once per environment (development, staging, production) during initial setup.
   - After initial setup, it will only run for rare, major infrastructure changes.
   - Uses the `connectors` Terraform workspace and modules.

2. Database setup (once to setup databases, then occasional perhaps monthly)
   - This workflow, implemented in databases.yml, manages database-related resources.
   - It includes creating and configuring database instances, setting up replication, and managing database security groups.
   - Runs initially to set up databases for each environment.
   - After initial setup, it may run monthly or as needed for database changes or upgrades.
   - Uses the `databases` Terraform workspace and module.
   - Depends on the successful execution of the connectors workflow.

3. App deployment (daily)
   - This workflow, implemented in app.yml, manages application-specific resources.
   - It includes updating ECS task definitions, managing ECR repositories, and handling application-specific configurations.
   - Runs frequently, potentially multiple times daily with each application deployment.
   - Uses the `app` Terraform workspace.
   - Depends on the successful execution of both connectors and databases workflows.

This structure allows for independent management of different aspects of the infrastructure, reducing the risk of unintended changes and improving deployment efficiency.

## 1. Project Structure Reorganization
### Recommended Folder Structure

```
terraform/
├── modules/
│   ├── connectors/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── databases/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── app/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── development.tfvars
│   ├── staging.tfvars
│   └── production.tfvars
├── connectors.tf
├── databases.tf
├── app.tf
├── providers.tf
├── backend.tf
├── connectors-variables.tf
├── databases-variables.tf
├── app-variables.tf
├── connectors-outputs.tf
├── databases-outputs.tf
└── app-outputs.tf
```

This structure separates concerns between the three main components (connectors, databases, and app) while keeping environment-specific variables in separate files. The root-level .tf files serve as entry points for each component, calling the respective modules and managing workspace-specific configurations.

### 1.1 Restructure Modules
- Create the following subdirectories in `terraform/modules/`:
  - `connectors/` (for infrequently changed infrastructure)
  - `databases/` (for occasionally updated database resources)
  - `app/` (for frequently deployed application resources)
- Move relevant resources from existing modules to these new modules.

### 1.2 Create Root Configurations
- Create separate root configuration files for each module:
  - `terraform/connectors.tf`
  - `terraform/databases.tf`
  - `terraform/app.tf`

### 1.3 Update Provider and Backend Configurations
- Create `providers.tf` and `backend.tf` in the root `terraform/` directory.
- Configure backend to use separate state files for each module.

## 2. Variable Management

### 2.1 Create Module-Specific Variable Files
- In the root `terraform/` directory, create:
  - `connectors-variables.tf`
  - `databases-variables.tf`
  - `app-variables.tf`
- Move relevant variables from the existing `variables.tf` to these new files.

### 2.2 Update Locals
- Modify `locals.tf` to include module-specific local values.

## 3. Output Management

### 3.1 Create Module-Specific Output Files
- Create output files for each module:
  - `terraform/connectors-outputs.tf`
  - `terraform/databases-outputs.tf`
  - `terraform/app-outputs.tf`

### 3.2 Implement Data Sources
- In the databases and app modules, use data sources to access outputs from the connectors module.

## 4. Implement Terraform Workspaces

### 4.1 Set Up Workspaces
- Create a workspace for each module:
  ```
  terraform workspace new connectors
  terraform workspace new databases
  terraform workspace new app
  ```

### 4.2 Update Root Configurations
- Modify the root configuration files to use workspace-specific variables and backends.

## 5. CI/CD Integration

### 5 Update Existing Workflows
1. Modify `.github/workflows/connectors.yml`:
  - Update to only apply changes to the connectors module
  - Adjust the trigger to run on specific branches or manual dispatch
2. Modify `.github/workflows/databases.yml`:
  - Configure to apply changes to the databases module
  - Set up to run on specific triggers (e.g., changes to database configurations)

3. Modify `.github/workflows/app.yml`:
  - Configure to apply changes to the app module
  - Set up to run frequently on manual triggers (later to trigger on pushes to specific branches)
