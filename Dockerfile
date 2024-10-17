# syntax=docker/dockerfile:1

ARG NODE_VERSION=18.17.1

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install
RUN npm install -g ts-node-dev
COPY . .
CMD ["ts-node-dev", "--respawn", "--transpile-only", "src/index.ts"]

FROM base AS build
ARG NODE_ENV
RUN npm ci
COPY . .
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS deploy
ARG NODE_ENV
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package*.json ./
COPY --from=build /app/config ./config
RUN npm ci --only=production
EXPOSE 5000
ENV NODE_ENV=${NODE_ENV}
CMD ["node", "build/src/index.js"]

FROM base AS test
RUN npm ci
COPY . .
CMD ["npm", "test"]
