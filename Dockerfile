# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=18.17.1

FROM node:${NODE_VERSION}-alpine AS build



# Use production node environment by default.
# ENV NODE_ENV production

WORKDIR /app

COPY package.json .

RUN npm install

RUN npm install -g typescript \
    npm i --save-dev @types/body-parser

COPY . .

RUN npm run build






FROM node:${NODE_VERSION}-alpine

# # Run the application as a non-root user.
# USER node

COPY package*.json .

RUN npm ci --only=production

COPY --from=build /app/dist ./dist

# Expose the port that the application listens on.
EXPOSE 5000

# Run the application.
CMD node dist/index.js
