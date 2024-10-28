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
RUN npm install -g typescript
RUN npm install --no-save @types/jest
COPY . .
RUN npx tsc --listFiles --listEmittedFiles

FROM node:${NODE_VERSION}-alpine AS deploy
ARG NODE_ENV
ARG NEO_4J_LEDGER_SPACE_USER
ARG NEO_4J_LEDGER_SPACE_PASS
ARG NEO_4J_LEDGER_SPACE_BOLT_URL
ARG NEO_4J_SEARCH_SPACE_USER
ARG NEO_4J_SEARCH_SPACE_PASS
ARG NEO_4J_SEARCH_SPACE_BOLT_URL
ARG OPEN_EXCHANGE_RATES_API
ARG JWT_SECRET
ARG CLIENT_API_KEY
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package*.json ./
COPY --from=build /app/config ./config
RUN npm ci --only=production
EXPOSE 3000
ENV NODE_ENV=${NODE_ENV}
ENV NEO_4J_LEDGER_SPACE_USER=${NEO_4J_LEDGER_SPACE_USER}
ENV NEO_4J_LEDGER_SPACE_PASS=${NEO_4J_LEDGER_SPACE_PASS}
ENV NEO_4J_LEDGER_SPACE_BOLT_URL=${NEO_4J_LEDGER_SPACE_BOLT_URL}
ENV NEO_4J_SEARCH_SPACE_USER=${NEO_4J_SEARCH_SPACE_USER}
ENV NEO_4J_SEARCH_SPACE_PASS=${NEO_4J_SEARCH_SPACE_PASS}
ENV NEO_4J_SEARCH_SPACE_BOLT_URL=${NEO_4J_SEARCH_SPACE_BOLT_URL}
ENV OPEN_EXCHANGE_RATES_API=${OPEN_EXCHANGE_RATES_API}
ENV JWT_SECRET=${JWT_SECRET}
ENV CLIENT_API_KEY=${CLIENT_API_KEY}
CMD ["node", "build/src/index.js"]

FROM base AS test
RUN npm ci
COPY . .
CMD ["npm", "test"]
