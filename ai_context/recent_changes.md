# Recent Changes
## .devcontainer/devcontainer.json
```
{
  "name": "Credex Core Dev Container",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm",
  "customizations": {
    "vscode": {
      "extensions": [
        "esbenp.prettier-vscode",
        "Postman.postman-for-vscode",
        "saoudrizwan.claude-dev",
        "GitHub.copilot",
        "dbaeumer.vscode-eslint",
        "ms-azuretools.vscode-docker",
        "eamodio.gitlens",
        "yzhang.markdown-all-in-one"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": true
        }
      }
    }
  },
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "18"
    },
    "ghcr.io/devcontainers/features/git:1": {}
  },
  "forwardPorts": [5000],
  "postCreateCommand": "npm install && npm install -g nodemon",
  "remoteEnv": {
    "NODE_ENV": "development"
  }
}
```

## .env.example
```
# Server Configuration
PORT=5000
NODE_ENV=development
DEPLOYMENT=dev

# WhatsApp Bot API Configuration
WHATSAPP_BOT_API_KEY=your_whatsapp_bot_api_key_here

# Neo4j Ledger Space Configuration
NEO_4J_LEDGER_SPACE_BOLT_URL=bolt://your_ledger_space_url_here
NEO_4J_LEDGER_SPACE_USER=your_ledger_space_username
NEO_4J_LEDGER_SPACE_PASS=your_ledger_space_password

# Neo4j Search Space Configuration
NEO_4J_SEARCH_SPACE_BOLT_URL=bolt://your_search_space_url_here
NEO_4J_SEARCH_SPACE_USER=your_search_space_username
NEO_4J_SEARCH_SPACE_PASS=your_search_space_password

# External API Configuration
OPEN_EXCHANGE_RATES_API=your_open_exchange_rates_api_key_here

# Add any other necessary environment variables here```

## .githooks/post-checkout
```
#!/bin/bash

# Run the update_ai_context.sh script
./update_ai_context.sh

# Add the updated AI context files
git add ai_context

# Exit with a success status
exit 0```

## .githooks/post-commit
```
#!/bin/bash

# Enable debugging
set -x

LOG_FILE="post-commit.log"

echo "Running post-commit hook" >> "$LOG_FILE"

# Check if this is an AI context update commit
if [[ "$(git log -1 --pretty=%B)" == "Update AI context" ]]; then
    echo "Skipping AI context update for AI context commit" >> "$LOG_FILE"
    exit 0
fi

# Run the update script and capture any errors
if ! ./update_ai_context.sh >> "$LOG_FILE" 2>&1; then
    echo "Error: Failed to update AI context" >> "$LOG_FILE"
    exit 1
fi

echo "AI context updated after commit" >> "$LOG_FILE"

# Check if there are changes to ai_context directory
if git status --porcelain ai_context | grep -q '^??'; then
    echo "New files detected in AI context" >> "$LOG_FILE"
    git add ai_context
elif git diff --quiet ai_context; then
    echo "No changes to AI context" >> "$LOG_FILE"
else
    echo "Changes detected in AI context" >> "$LOG_FILE"
    git add ai_context
fi

if git diff --staged --quiet; then
    echo "No staged changes for AI context" >> "$LOG_FILE"
else
    echo "Committing AI context changes" >> "$LOG_FILE"
    if ! git commit -m "Update AI context" --no-verify >> "$LOG_FILE" 2>&1; then
        echo "Failed to commit AI context changes" >> "$LOG_FILE"
        exit 1
    fi
    echo "AI context committed after main commit" >> "$LOG_FILE"
fi

echo "Post-commit hook completed" >> "$LOG_FILE"

# Disable debugging
set +x```

## .githooks/pre-commit
```
#!/bin/bash

# Run the update_ai_context.sh script
./update_ai_context.sh

# Add the updated AI context files
git add ai_context

# Exit with a success status
exit 0```

