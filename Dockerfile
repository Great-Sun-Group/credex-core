# syntax=docker/dockerfile:1

ARG NODE_VERSION=18.17.1

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
CMD ["npm", "run", "docker:dev"]

FROM base AS production-build
RUN npm ci
COPY . .
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS production
WORKDIR /app
COPY --from=production-build /app/build ./build
COPY --from=production-build /app/package*.json ./
COPY --from=production-build /app/config/config.js ./config/config.js
RUN npm ci --only=production
EXPOSE 5000
CMD ["node", "build/src/index.js"]

FROM base AS test
RUN npm ci
COPY . .
CMD ["npm", "test"]
