#!/bin/bash

# Determine the location of the .env file
if [ -f .env ]; then
  ENV_FILE=".env"
elif [ -f ../.env ]; then
  ENV_FILE="../.env"
else
  echo "Error: .env file not found in current directory or parent directory."
  exit 1
fi

# Extract AWS credentials from .env file
export AWS_REGION="af-south-1"

# Get the raw values without any quotes or whitespace
ACCESS_KEY=$(grep AWS_ACCESS_KEY $ENV_FILE | cut -d '=' -f2 | tr -d ' "'\'' ')
SECRET_KEY=$(grep AWS_SECRET_ACCESS_KEY $ENV_FILE | cut -d '=' -f2 | tr -d ' "'\'' ')

# Set both AWS_ACCESS_KEY_ID and AWS_ACCESS_KEY to ensure compatibility
export AWS_ACCESS_KEY="$ACCESS_KEY"
export AWS_ACCESS_KEY_ID="$ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$SECRET_KEY"

echo "AWS credentials set successfully:"
echo "AWS_REGION: $AWS_REGION"
echo "AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID"
echo "AWS_SECRET_ACCESS_KEY: [hidden]"

# Test if credentials are valid by making a simple AWS CLI call
if command -v aws &> /dev/null; then
  echo "Testing AWS credentials..."
  aws sts get-caller-identity --region $AWS_REGION &> /dev/null
  if [ $? -eq 0 ]; then
    echo "AWS credentials are valid!"
  else
    echo "Warning: AWS credentials may not be valid. Please check your .env file."
  fi
else
  echo "Note: AWS CLI not found. Cannot verify if credentials are valid."
fi
