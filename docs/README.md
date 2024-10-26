# Developer Documentation for the credex-core API

This documentation includes a complete overview and orientation to developing, testing and deploying the credex-core codebase. Continue reading for an outline of the architecture, jump to the [full list of developer resources](#complete-list-of-developer-resources) below, or use these quick references for working on the [API code](developerAPI/README.md) or a [client app](developerClient/README.md).

## Environments
Configuration for all environments is outlined in [Environment Setup](environment_setup.md).

### Local
A local environment is supplied by a developer's own machine or a virtual Github Codespaces machine, and linked cloud-deployed instances of neo4j (Neo4j Aura). Testing in this environment (link) ensures that all endpoints return data as expected. The value of the environment variable in this deployment is `development`, like the first deployed environment below.

### Development
The `development` environment and databases are intended to provide initial deployment testing on isolated data in dev DBs by manually-triggered deployment off the `dev` branch using Github Workflows. This testing (link), done over HTTPS via the API endpoints, includes data integrity checks across larger data sets and mutiple DCO exchange rate updates.

### Staging
The `staging` environment and databases are intended to provide production-scale testing in a mock production environment, and are deployed and tested automatically by pushes to the `stage` branch. When triggered, the deployment of the staging environment includes the full deployment of production-scale infrastructor (connectors, databases, application), automatic performance testing on production-scale data sets, spot checks for data integrity, and full deployment tear-down when tests are passed to satisfaction. Scale tests bypass the HTTPS protocols, running fully internal to the server. This environment can also mimic the update of deployed neo4j infrastructure. (Not yet true, still manually deployed from `stage` branch and no large scale test, tear-down, or DB deploy/update scripts written.)

### Production
The `production` environment enables members to interact with the production databases that host the live ledger of the credex ecosystem. This environment automatically redeploys the app by running the application workflow every day just after midnight UTC at the end of the DCO. (Not yet true, still manually deployed from `prod` branch). Updates to the underlying database or connectors infrastructure are manually deployed from the `prod` branch using Github Workflows.

## Neo4j Databases

Credex-core runs on two neo4j databases. LedgerSpace is the shared ledger containing the full state of the credex ecosystem. SearchSpace contains only unredeemed credexes, and is optimized to find credloops. On every credloop found and cleared, LedgerSpace is updated accordingly.

## Express.js Server

The express.js server is initialized in `src/index.ts`, which provides the cronjobs and endpoints that power the ecosystem and enable members and client apps to interact with its ledger.

### Cronjobs

The src/core-cron/ module hosts the cronjobs:

- DailyCredcoinOffering runs every day at midnight UTC, calculating the value of 1 CXX and updating all ecosystem values accordingly.
- MinuteTransactionQueue runs every minute, clearing credloops of value creation across the ecosystem.

### Endpoints

Endpoints and routes are deployed for the modules: Member, Account, Credex, Avatar, and AdminDashboard. Endpoints for the Dev module are included in development and staging deployments, but not in production.

## Deployment Summary

The credex-core application is deployed using AWS services (including ECS, ECR), Terraform for infrastructure management, and GitHub Actions for CI/CD. The application relies on Neo4j Enterprise Edition for data storage and management. The deployment process runs in three separate workflows:

1. `connectors.yml`: Handles the deployment of infrequently changed infrastructure such as clusters and load balancers.
2. `databases.yml`: Sets up and manages Neo4j database resources (ledgerSpace and searchSpace).
3. `app.yml`: Deploys the application itself.

This separation allows for granular control over each part of the deployment process and makes it easier to manage and troubleshoot specific aspects of the deployment. Environment is determined at run time by which branch the workflow is run on, enabling same workflow files to manage all environments.

## Complete List of Developer Resources

### README References
- [Development of the credex-core API](developerAPI/README.md)
- [Development of Client Apps](developerClient/README.md)

### Getting Started
- [Environment Setup](environment_setup.md)
- [Connectors Workflow and Terraform Module](deployment/connectors_workflow.md)
- [Databases Workflow and Terraform Module](deployment/databases_workflow.md)
- [Application Workflow and Terraform Module](deployment/app_workflow.md)
- [credex-permissions.json for manual AWS entry](deployment/credex-permissions.json)

### Deployment
- [Neo4j License Management](deployment/neo4j_license.md)
- [Infrastructure Scaling Report](deployment/instance_size_first200k.md)

### Member Modules
- [Account](developerClient/module/Account.md)
- [Avatar](developerClient/module/Avatar.md)
- [Credex](developerClient/module/Credex.md)
- [Member](developerClient/module/Member.md)

### Admin Modules
- [AdminDashboard](developerClient/module/AdminDashboard.md)
- [DevAdmin](developerClient/module/DevAdmin.md)

### Core Cronjobs
- [Daily Credcoin Offering](DCO.md)
- [Minute Transaction Queue](MTQ.md)

### Database Schemas
- [ledgerSpace Schema](developerAPI/ledgerSpace_schema.md)
- [searchSpace Schema](developerAPI/searchSpace_schema.md)

### Development Guides
- [Endpoint Security and Authorization](auth_security.md)
- [Swagger for AI-assisted client app dev](developerClient/swagger.md)
- [Logging Best Practices](developerAPI/logging_best_practices.md)

### Testing
- [Testing Guide](tests/testing_guide.md)
