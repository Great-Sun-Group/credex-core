# Developer Deployment Guide

This document outlines the deployment process for developers working on the credex-core application in local development and GitHub Codespaces environments.

## 1. Introduction

The credex-core application can be developed and tested in local environments and GitHub Codespaces. This guide provides instructions for setting up and working in these environments.

## 2. Prerequisites

- GitHub account with access to Great Sun Group's credex-cor
### 2.1 Prerequisites For Local Development

- Git
- Docker and Docker Compose
- Visual Studio Code

## 3. Environment Setup

### 3.1 Local Development

1. Clone the repository:

   ```
   git clone https://github.com/Great-Sun-Group/greatsun-dev.git
   cd greatsun-dev
   ```

2. Create a `.env` file in the root of the project based on `.env.example` and fill in the required environment variables.

3. Build and start the development container:

   ```
   docker-compose up -d --build
   ```

4. Attach VS Code to the running container or use `docker exec` to access the container's shell.

### 3.2 GitHub Codespaces

1. Go to the main page of the greatsun-dev repository (dev branch), and create a new branch from dev.
   2ithin the new branch, click on the "Code" button, select the "Codespaces" tab, and click "Create codespace on new-branch-name".
2. The Codespace will automatically set up the environment.
3. Use the integrated terminal to run commands and start the application:
   ```
   npm run dev
   ```

## 4. Configuration

### 4.1 Environment Variables

The application uses environment variables for configuration. These are defined in [config/config.ts](config/config.ts).

For development environments, the `NODE_ENV` variable defaults to 'development'.

## 5. Development Process

1. Make changes in your local environment or GitHub Codespaces.
2. Test your changes thoroughly in the development environment.
3. Commit your changes and push to your branch.
4. Create a pull request to merge your changes into the `dev` branch.

## 6. Troubleshooting

- For local development issues, check Docker Compose logs and environment variables in the local .env file.
- For Codespaces issues, check Codespaces logs and environment variables in Codespaces secrets.

## 7. Security Considerations

- Never commit sensitive information (passwords, API keys, etc.) to the repository.
- Use `.env` files for local development, ensuring they are listed in `.gitignore`.
- Be cautious about which ports are publicly accessible in Codespaces.

## 8. Continuous Improvement

Consider the following improvements for the development process:

- Optimize Codespaces configuration for faster startup and development experience
- Implement more comprehensive local testing procedures
- Set up automated code quality checks and linting in the development environment

By continuously improving the development process, you can enhance productivity and code quality in the credex-core application.
