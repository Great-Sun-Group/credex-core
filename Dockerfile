# syntax=docker/dockerfile:1

FROM node:18.17.1-alpine AS base
WORKDIR /app
COPY package*.json ./

# Build stage that creates production assets
FROM base AS build
RUN npm ci
COPY . .
# Force rebuild and show TypeScript version and compilation details
RUN echo $(date) > buildtime && \
    npx tsc --version && \
    echo "Starting TypeScript compilation..." && \
    npx tsc && \
    echo "TypeScript compilation completed" && \
    echo "Build output structure:" && \
    ls -la /app/build && \
    echo "Source build:" && \
    ls -la /app/build/src || exit 1

# Production stage with minimal image
FROM node:18.17.1-alpine AS production
WORKDIR /app
# Copy build output and necessary files
COPY --from=build /app/build ./build
COPY --from=build /app/package*.json ./
RUN npm ci --only=production && \
    echo "Production files:" && \
    ls -la /app && \
    echo "Build directory:" && \
    ls -la /app/build && \
    echo "Source directory:" && \
    ls -la /app/build/src
EXPOSE 3000
ENV NODE_ENV=production
# Update the command to use the correct path
CMD ["node", "build/src/index.js"]

# Development stage extends base
FROM base AS development
RUN npm install
RUN npm install -g ts-node-dev
COPY . .
ENV NODE_ENV=development
CMD ["ts-node-dev", "--respawn", "--transpile-only", "src/index.ts"]

# Test stage
FROM base AS test
RUN npm ci
COPY . .
CMD ["npm", "test"]
