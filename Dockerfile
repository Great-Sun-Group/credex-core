# syntax=docker/dockerfile:1

ARG NODE_VERSION=18.17.1

FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:${NODE_VERSION}-alpine

WORKDIR /app

COPY --from=build /app/build ./build
COPY --from=build /app/package*.json ./
COPY --from=build /app/config/config.js ./config/config.js
RUN npm ci --only=production

# Expose the port that the application listens on.
EXPOSE 5000

# The environment variables will be provided at runtime

# Run the application.
CMD ["node", "build/src/index.js"]
