#!/bin/bash

# This script generates Neo4j usernames, passwords, Bolt URLs, and JWT secret, and stores them as GitHub Secrets for the specified environment

# Check if environment argument is provided
if [ $# -eq 0 ]; then
    echo "No environment specified. Usage: $0 <environment>"
    exit 1
fi

ENVIRONMENT=$1

# Function to generate a random string
generate_random_string() {
    openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | fold -w ${1:-32} | head -n 1
}

# Generate Neo4j credentials for LedgerSpace
NEO_4J_LEDGER_SPACE_USER="neo4j$(generate_random_string 6)"
NEO_4J_LEDGER_SPACE_PASS=$(generate_random_string 16)
NEO_4J_LEDGER_SPACE_BOLT_URL="bolt://${NEO4J_LEDGER_IP}:7687"

# Generate Neo4j credentials for SearchSpace
NEO_4J_SEARCH_SPACE_USER="neo4j$(generate_random_string 6)"
NEO_4J_SEARCH_SPACE_PASS=$(generate_random_string 16)
NEO_4J_SEARCH_SPACE_BOLT_URL="bolt://${NEO4J_SEARCH_IP}:7687"

# Generate JWT Secret
JWT_SECRET=$(generate_random_string 32)

# Store secrets in GitHub
echo "::add-mask::$NEO_4J_LEDGER_SPACE_USER"
echo "::add-mask::$NEO_4J_LEDGER_SPACE_PASS"
echo "::add-mask::$NEO_4J_LEDGER_SPACE_BOLT_URL"
echo "::add-mask::$NEO_4J_SEARCH_SPACE_USER"
echo "::add-mask::$NEO_4J_SEARCH_SPACE_PASS"
echo "::add-mask::$NEO_4J_SEARCH_SPACE_BOLT_URL"
echo "::add-mask::$JWT_SECRET"

# Save secrets to GitHub Secrets for the specified environment
gh secret set NEO_4J_LEDGER_SPACE_USER -b"$NEO_4J_LEDGER_SPACE_USER" --env $ENVIRONMENT
gh secret set NEO_4J_LEDGER_SPACE_PASS -b"$NEO_4J_LEDGER_SPACE_PASS" --env $ENVIRONMENT
gh secret set NEO_4J_LEDGER_SPACE_BOLT_URL -b"$NEO_4J_LEDGER_SPACE_BOLT_URL" --env $ENVIRONMENT
gh secret set NEO_4J_SEARCH_SPACE_USER -b"$NEO_4J_SEARCH_SPACE_USER" --env $ENVIRONMENT
gh secret set NEO_4J_SEARCH_SPACE_PASS -b"$NEO_4J_SEARCH_SPACE_PASS" --env $ENVIRONMENT
gh secret set NEO_4J_SEARCH_SPACE_BOLT_URL -b"$NEO_4J_SEARCH_SPACE_BOLT_URL" --env $ENVIRONMENT
gh secret set JWT_SECRET -b"$JWT_SECRET" --env $ENVIRONMENT

# Output all secrets at once for secure manual storage
echo "--- BEGIN GENERATED SECRETS FOR $ENVIRONMENT ENVIRONMENT ---"
echo "NEO_4J_LEDGER_SPACE_USER=$NEO_4J_LEDGER_SPACE_USER"
echo "NEO_4J_LEDGER_SPACE_PASS=$NEO_4J_LEDGER_SPACE_PASS"
echo "NEO_4J_LEDGER_SPACE_BOLT_URL=$NEO_4J_LEDGER_SPACE_BOLT_URL"
echo "NEO_4J_SEARCH_SPACE_USER=$NEO_4J_SEARCH_SPACE_USER"
echo "NEO_4J_SEARCH_SPACE_PASS=$NEO_4J_SEARCH_SPACE_PASS"
echo "NEO_4J_SEARCH_SPACE_BOLT_URL=$NEO_4J_SEARCH_SPACE_BOLT_URL"
echo "JWT_SECRET=$JWT_SECRET"
echo "--- END GENERATED SECRETS FOR $ENVIRONMENT ENVIRONMENT ---"

echo "Secrets have been generated and stored in GitHub Secrets for the $ENVIRONMENT environment. Please copy and securely store the above output."
