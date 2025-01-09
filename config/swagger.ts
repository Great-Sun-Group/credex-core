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
        schemas: {
          Error: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                example: false
              },
              message: {
                type: "string",
                description: "Error message"
              },
              details: {
                type: "string",
                description: "Detailed error information"
              },
              error: {
                type: "string",
                description: "Technical error details"
              }
            }
          },
          ServiceHealth: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["healthy", "error"],
                description: "Service health status"
              },
              message: {
                type: "string",
                description: "Health status message"
              },
              details: {
                type: "string",
                description: "Additional health status details"
              }
            }
          },
          FCMToken: {
            type: "object",
            required: ["token", "userId", "platform"],
            properties: {
              token: {
                type: "string",
                description: "Firebase Cloud Messaging token"
              },
              userId: {
                type: "string",
                description: "User ID associated with the token"
              },
              platform: {
                type: "string",
                enum: ["ios", "android"],
                description: "Device platform"
              },
              createdAt: {
                type: "string",
                format: "date-time",
                description: "Token creation timestamp"
              },
              updatedAt: {
                type: "string",
                format: "date-time",
                description: "Token last update timestamp"
              }
            }
          },
          NotificationResponse: {
            type: "object",
            required: ["success"],
            properties: {
              success: {
                type: "boolean",
                description: "Operation success status"
              },
              message: {
                type: "string",
                description: "Response message"
              },
              error: {
                type: "string",
                description: "Error message if operation failed"
              },
              details: {
                type: "string",
                description: "Additional error or success details"
              },
              isValid: {
                type: "boolean",
                description: "Token validation result (for validate-token endpoint)"
              }
            }
          },
          NotificationType: {
            type: "string",
            enum: [
              "OFFER_CREATED",
              "OFFER_CANCELLED",
              "OFFER_ACCEPTED",
              "OFFER_DECLINED",
              "CREDLOOP_COMPLETED"
            ],
            description: "Type of notification event"
          },
          NotificationData: {
            type: "object",
            required: ["type", "recipientID", "data"],
            properties: {
              type: {
                $ref: "#/components/schemas/NotificationType"
              },
              recipientID: {
                type: "string",
                description: "ID of the notification recipient"
              },
              data: {
                type: "object",
                required: ["credexID"],
                properties: {
                  credexID: {
                    type: "string",
                    description: "ID of the related Credex transaction"
                  },
                  amount: {
                    type: "string",
                    description: "Transaction amount"
                  },
                  denomination: {
                    type: "string",
                    description: "Currency denomination"
                  },
                  counterpartyName: {
                    type: "string",
                    description: "Name of the counterparty"
                  },
                  clearedPayable: {
                    type: "object",
                    properties: {
                      amount: { type: "string" },
                      denomination: { type: "string" },
                      owedTo: { type: "string" }
                    }
                  },
                  clearedReceivable: {
                    type: "object",
                    properties: {
                      amount: { type: "string" },
                      denomination: { type: "string" },
                      owedFrom: { type: "string" }
                    }
                  }
                }
              }
            }
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
        { name: "Notifications", description: "Push notification management and testing operations" },
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
