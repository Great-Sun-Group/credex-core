"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const config_1 = require("./config");
const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Credex Core API",
            version: "1.0.0",
            description: "API documentation for the Credex Core system. This API provides endpoints for managing members, accounts, Credex transactions, and recurring payments.",
        },
        servers: [
            {
                url: `http://localhost:${config_1.config.port}`,
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
            {
                name: "DevAdmin",
                description: "Development and administration operations",
            },
        ],
    },
    apis: ["./src/**/*.ts"], // Path to the API docs
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
//# sourceMappingURL=swagger.js.map