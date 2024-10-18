# Revised Terraform Refactor Workplan

## 1. Project Structure Reorganization

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

### 5.1 Update Existing Workflow
- Modify `.github/workflows/connectors.yml`:
  - Update to only apply changes to the connectors module
  - Adjust the trigger to run on specific branches or manual dispatch

### 5.2 Create New Workflows
- Create `.github/workflows/databases.yml`:
  - Configure to apply changes to the databases module
  - Set up to run on specific triggers (e.g., changes to database configurations)

- Create `.github/workflows/app-deploy.yml`:
  - Configure to apply changes to the app module
  - Set up to run frequently (e.g., on every push to main branch)

### 5.3 Workflow File Notes
- connectors.yml:
  - Runs infrequently, mainly for initial setup or rare infrastructure changes
  - Uses the `connectors` workspace
  - Applies only to resources in the `modules/connectors/` directory

- databases.yml:
  - Runs occasionally, when database configurations change
  - Uses the `databases` workspace
  - Applies only to resources in the `modules/databases/` directory
  - Should depend on successful execution of connectors.yml

- app-deploy.yml:
  - Runs frequently, for application deployments
  - Uses the `app` workspace
  - Applies only to resources in the `modules/app/` directory
  - Should depend on successful execution of both connectors.yml and databases.yml