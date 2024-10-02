# Developer Deployment Guide

This document outlines the deployment process for developers working on the credex-core application in local and GitHub Codespaces environments using Docker.

## Prerequisites

- GitHub account with access to Great Sun Group's credex-core.

### Prerequisites For Local Development

- Git
- Docker and Docker Compose
- Visual Studio Code

## Environment Setup

### Local Development

1. Clone the repository:

   ```
   git clone https://github.com/Great-Sun-Group/credex-core.git
   cd credex-core
   ```

2. Create a `.env` file in the root of the project based on `.env.example` and fill in the required environment variables (see below).
3. `git checkout -b new-branch-name` to start local development

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

You can use VS Code's "Attach to Running Container" feature to work within the Docker container, or use `docker exec` to access the container's shell.

## Environment Variables

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

## Development Process

1. Make changes in your local environment or GitHub Codespaces.
2. Test your changes thoroughly in the development environment:
   ```
   npm run docker:dev
   ```
3. Do checks in production mode then run tests in the Docker environment:
   ```
   npm run docker:dev:prod
   npm run docker:test
   ```
4. Commit your changes and push to your branch.
5. Create a pull request to merge your changes into a project branch or the `dev` branch itself.

## Troubleshooting

- For development issues, check Docker Compose logs:
  ```
  docker-compose logs
  ```
- Ensure all required environment variables are set correctly in your `.env` file.
- For Codespaces issues, check Codespaces logs and environment variables in Codespaces secrets.

## Security Considerations

- Never commit sensitive information (passwords, API keys, etc.) to the repository.
- Use `.env` files for local development, ensuring they are listed in `.gitignore`.
- Be cautious about which ports are publicly accessible in Codespaces.

## Continuous Improvement

Consider the following improvements for the development process:

- Optimize Docker configurations for faster builds and more efficient resource usage
- Implement more comprehensive testing procedures, including Docker-specific tests
- Set up automated code quality checks and linting in the Docker environment
- Explore ways to further align the Docker development environment with production settings
- Optimize Codespaces configuration for faster startup and development experience

By continuously improving the development process, you can enhance productivity and code quality in the credex-core application while ensuring consistency across different environments.
