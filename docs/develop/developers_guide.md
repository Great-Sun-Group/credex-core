# Developer's Guide to Deployment Process

This document outlines the deployment process for developers working on the credex-core application in local and GitHub Codespaces environments using Docker.

## Prerequisites

- GitHub account with access to Great Sun Group's credex-core.

### Prerequisites For Local Development

- Git
- Docker and Docker Compose
- Visual Studio Code
- Visual Studio Code Remote - Containers extension
- Node.js and npm (for running deployment scripts locally)

## Environment Setup

### Local Development

1. Clone the repository:

   ```
   git clone https://github.com/Great-Sun-Group/credex-core.git
   cd credex-core
   ```

2. Create a `.env` file in the root of the project based on `.env.example` and fill in the required environment variables (see below).
3. `git checkout -b new-branch-name` to start local development

### Using Devcontainers with VS Code

Devcontainers provide a consistent, reproducible development environment across different machines. This project is set up to use devcontainers, which encapsulate the development environment in a Docker container.

To use devcontainers:

1. Ensure you have the "Remote - Containers" extension installed in VS Code.
2. Open the project folder in VS Code.
3. When prompted, click "Reopen in Container" or use the command palette (F1) and select "Remote-Containers: Reopen in Container".
4. VS Code will build the devcontainer (this may take a few minutes the first time) and open the project inside the container.

Benefits of using devcontainers:
- Consistent development environment across team members
- Easy onboarding for new developers
- Isolation from the host system
- Pre-configured development tools and extensions

### GitHub Codespaces

1. Go to your personal GitHub Settings -> Codespaces and Add New Secret for each secret listed below, giving it access to the credex-core repository.
2. Go to the main page of the credex-core repository (dev branch), and create a new branch from dev.
3. Within the new branch, click on the "Code" button, select the "Codespaces" tab, and click "Create codespace on new-branch-name".
4. The Codespace will automatically set up the environment.

## Start Development Server

To start the development environment using Docker:
   ```
   npm run docker:dev
   ```
   This command builds the Docker image and starts the container with hot-reloading enabled.

To run the application in production mode within Docker:
   ```
   npm run docker:dev:prod
   ```

To run tests within a Docker container:
   ```
   npm run docker:test
   ```

When using devcontainers or GitHub Codespaces, these commands can be run directly in the integrated terminal, as you're already working within the container environment.

You can use VS Code's "Attach to Running Container" feature to work within the Docker container, or use `docker exec` to access the container's shell.

## Environment Variables

The following environment variables are required:

NEO_4J_LEDGER_SPACE_BOLT_URL
NEO_4J_LEDGER_SPACE_PASS
NEO_4J_LEDGER_SPACE_USER
NEO_4J_SEARCH_SPACE_BOLT_URL
NEO_4J_SEARCH_SPACE_PASS
NEO_4J_SEARCH_SPACE_USER
- To set up Neo4j Aura databases:
   1. Go to https://neo4j.com/cloud/aura/ and sign up for two separate accounts using different email addresses.
   2. For each account, create a new database instance. One should be name ledgerSpace and the other searchSpace.
   3. Once the databases are created, you'll be provided with connection details.
   4. Use the Bolt URL, username, and password for each database to fill in the corresponding environment variables.
- The LEDGER_SPACE variables correspond to one database, and the SEARCH_SPACE variables to the other.

OPEN_EXCHANGE_RATES_API
- To get this secret from Open Exchange Rates:
   1. Go to https://openexchangerates.org/ and sign up for an account.
   2. Once logged in, navigate to your account dashboard.
   3. Look for your App ID or API Key.
   4. Copy this key and use it as the value for OPEN_EXCHANGE_RATES_API.

WHATSAPP_BOT_API_KEY
JWT_SECRET
- create your own unique random strings

For development environments, the `NODE_ENV` variable defaults to 'development'.

The following variables are optional and only required for deployment:

AWS_ACCESS_KEY(? not sure if still required)
AWS_SECRET_ACCESS_KEY(? not sure if still required)
GH_APP_ID
GH_INSTALLATION_ID
GH_APP_PRIVATE_KEY

These deployment-specific variables should only be set by authorized team members with the necessary AWS and GitHub permissions.

## Initializing, Resetting, and Progressing the Databases

To clear your dev databases, hit the `api/v1/dev/clearDevDBs` endpoint with your dev server running. Use API software, or in local dev use this command in a different terminal from where the server is running:
```
curl -X DELETE "http://localhost:5000/api/v1/dev/clearDevDBs" -H "Content-Type: application/json" -v
```
In codespaces, use this:
```
curl -X DELETE "https://${CODESPACE_NAME}-5000.app.github.dev/api/v1/dev/clearDevDBs" -H "X-Github-Token: $GITHUB_TOKEN" -H "Content-Type: application/json" -v
```

To run the DCO and advance the day state, including new exchange rates, hit the `api/v1/dev/forceDCO` endpoint. If the database has been wiped or is new, this will first create initialization nodes and relationship then run the first DCO, bringing the credex ecosystem online.

This can be done from API software, or in local dev with:
```
curl -X POST "http://localhost:5000/api/v1/dev/forceDCO" -H "Content-Type: application/json" -v
```
In codespaces:
```
curl -X POST "https://${CODESPACE_NAME}-5000.app.github.dev/api/v1/dev/forceDCO" -H "X-Github-Token: $GITHUB_TOKEN" -H "Content-Type: application/json" -v
```

## Development Process

1. Make changes in your local environment or GitHub Codespaces.
   ```
   npm run dev: We need to set up this command again with nodemon for stripped-down dev
   ```
2. Test your changes thoroughly in the development environment:
   ```
   npm run docker:dev
   ```
3. Do checks in production mode then run tests in the Docker environment:
   ```
   npm run docker:dev:prod
   npm run docker:test (not really developed yet)
   ```
4. Commit your changes and push to your branch.
6. Create a pull request to merge your changes into a project branch or the `dev` branch itself. Enter this in the Cline plugin:
   ```
   read projects/merge/getDiff.sh and execute from <your-branch-name> to <branch-to-merge-to>
   ```
7. Cline should step you through the process to create and submit a thorough merge summary from the code pushed to the Github repo.
8. Once created, visit the pull request online, make any necessary edits, then request review.

## Troubleshooting

- For development issues, check Docker Compose logs:
  ```
  docker-compose logs
  ```
- Ensure all required environment variables are set correctly in your `.env` file.
- For Codespaces or devcontainer issues, check the "Remote" output panel in VS Code for logs and error messages.
- If you encounter issues with the devcontainer, try rebuilding it using the command palette (F1) and selecting "Remote-Containers: Rebuild Container".

## Security Considerations

- Never commit sensitive information (passwords, API keys, etc.) to the repository.
- Use `.env` files for local development, ensuring they are listed in `.gitignore`.
- Be cautious about which ports are publicly accessible in Codespaces or devcontainers.

## Continuous Improvement

Consider the following improvements for the development and deployment process:

- Optimize Docker configurations for faster builds and more efficient resource usage
- Implement more comprehensive testing procedures, including Docker-specific tests
- Set up automated code quality checks and linting in the Docker environment
- Explore ways to further align the Docker development environment with production settings
- Optimize Codespaces and devcontainer configurations for faster startup and development experience
- Enhance post-deployment verification steps
- Implement automated rollback procedures for failed deployments

By continuously improving the development and deployment processes, you can enhance productivity, code quality, and reliability in the credex-core application while ensuring consistency across different environments.
