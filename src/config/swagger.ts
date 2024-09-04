import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Credex Core API',
      version: '1.0.0',
      description: 'API documentation for the Credex Core system',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/**/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);