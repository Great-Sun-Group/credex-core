#!/bin/bash

echo "Starting post-deployment verification..."

# Check GitHub Actions status
echo "Checking GitHub Actions status..."
gh run list --limit 1 --workflow deploy-production.yml

# Check ECS status
echo "Checking ECS status..."
./check_ecs_status.sh

# Check health endpoint
echo "Checking health endpoint..."
API_URL=${API_URL:-"http://localhost:5000"}
curl $API_URL/health

# Run integration tests
echo "Running integration tests..."
API_URL=$API_URL npm run test:integration

# Run performance benchmark
echo "Running performance benchmark..."
API_URL=$API_URL node src/tests/performance/benchmark.js

echo "Post-deployment verification complete."