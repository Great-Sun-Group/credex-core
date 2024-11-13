import swaggerJsdoc from "swagger-jsdoc";
import { getConfig } from "./config";
import logger from '../src/utils/logger';
import path from 'path';

export async function generateSwaggerSpec(): Promise<swaggerJsdoc.OAS3Definition> {
  const config = await getConfig();

  const options: swaggerJsdoc.Options = {
    failOnErrors: true,
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Credex Core API",
        version: "1.0.0",
        description:
          "API documentation for the Credex Core system. This API provides endpoints for managing members, accounts, Credex transactions, and recurring payments.",
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: "Development server",
        },
        {
          url: "https://api.credex.example.com",
          description: "Production server",
        },
        {
          url: "https://staging-api.credex.example.com",
          description: "Staging server",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
          devAdminAuth: {
            type: "apiKey",
            in: "header",
            name: "X-Dev-Admin-Key",
            description: "Development admin API key for authentication"
          }
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
      tags: [
        { name: "Members", description: "Member management operations" },
        { name: "Accounts", description: "Account management operations" },
        { name: "Credex", description: "Credex transaction operations" },
        { name: "Recurring", description: "Recurring payment operations" },
        { name: "Admin", description: "Administrative operations for managing members, accounts, and credex transactions" },
        { name: "DevAdmin", description: "Development and administration operations" },
      ],
    },
    apis: [
      './src/api/**/routes/*.ts',
      './src/api/**/*Schema*.ts',
      './src/api/**/*Type*.ts'
    ]
  };

  // Enable swagger-jsdoc debug mode for verbose logging
  process.env.SWAGGER_DEBUG = 'true';

  logger.debug("Swagger configuration:", { 
    apis: options.apis,
    cwd: process.cwd()
  });

  const swaggerSpec = swaggerJsdoc(options) as swaggerJsdoc.OAS3Definition;
  
  // Log some stats about the generated spec
  const paths = Object.keys(swaggerSpec.paths || {});
  logger.debug("Swagger specification generated", {
    pathCount: paths.length,
    paths: paths
  });

  return swaggerSpec;
}
