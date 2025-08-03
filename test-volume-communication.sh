#!/bin/bash

# Test script to verify Docker volume communication between API and daemon containers

echo "=== Testing Docker Volume Communication ==="
echo "Date: $(date)"
echo

# Test 1: Check if both containers are running
echo "1. Checking container status..."
API_RUNNING=$(docker ps --filter "name=credex-core-prod" --format "{{.Names}}" | grep -c "credex-core-prod" || echo "0")
DAEMON_RUNNING=$(docker ps --filter "name=credex-deploy-daemon" --format "{{.Names}}" | grep -c "credex-deploy-daemon" || echo "0")

echo "   API Container (credex-core-prod): $([[ $API_RUNNING -eq 1 ]] && echo "✅ Running" || echo "❌ Not running")"
echo "   Daemon Container (credex-deploy-daemon): $([[ $DAEMON_RUNNING -eq 1 ]] && echo "✅ Running" || echo "❌ Not running")"
echo

# Test 2: Check volume mounts
echo "2. Checking volume mounts..."
if [[ $API_RUNNING -eq 1 ]]; then
    echo "   API Container volume mount:"
    docker exec credex-core-prod mount | grep deploy-queue || echo "   ❌ No deploy-queue mount found"
else
    echo "   ❌ API container not running - cannot check mounts"
fi

if [[ $DAEMON_RUNNING -eq 1 ]]; then
    echo "   Daemon Container volume mount:"
    docker exec credex-deploy-daemon mount | grep deploy-queue || echo "   ❌ No deploy-queue mount found"
else
    echo "   ❌ Daemon container not running - cannot check mounts"
fi
echo

# Test 3: Test file creation from API container
echo "3. Testing file creation from API container..."
if [[ $API_RUNNING -eq 1 ]]; then
    TEST_FILE="api-test-$(date +%s).json"
    TEST_CONTENT='{"test": "from-api", "timestamp": "'$(date -Iseconds)'", "source": "api-container"}'
    
    if docker exec credex-core-prod sh -c "echo '$TEST_CONTENT' > /app/deploy-queue/$TEST_FILE"; then
        echo "   ✅ Successfully created file from API container: $TEST_FILE"
        
        # Check if daemon can see the file
        if [[ $DAEMON_RUNNING -eq 1 ]]; then
            if docker exec credex-deploy-daemon test -f "/app/deploy-queue/$TEST_FILE"; then
                echo "   ✅ Daemon container can see the file"
                DAEMON_CONTENT=$(docker exec credex-deploy-daemon cat "/app/deploy-queue/$TEST_FILE")
                echo "   📄 File content from daemon: $DAEMON_CONTENT"
            else
                echo "   ❌ Daemon container cannot see the file"
            fi
        fi
    else
        echo "   ❌ Failed to create file from API container"
    fi
else
    echo "   ❌ API container not running - cannot test file creation"
fi
echo

# Test 4: Test file creation from daemon container
echo "4. Testing file creation from daemon container..."
if [[ $DAEMON_RUNNING -eq 1 ]]; then
    TEST_FILE="daemon-test-$(date +%s).json"
    TEST_CONTENT='{"test": "from-daemon", "timestamp": "'$(date -Iseconds)'", "source": "daemon-container"}'
    
    if docker exec credex-deploy-daemon sh -c "echo '$TEST_CONTENT' > /app/deploy-queue/$TEST_FILE"; then
        echo "   ✅ Successfully created file from daemon container: $TEST_FILE"
        
        # Check if API can see the file
        if [[ $API_RUNNING -eq 1 ]]; then
            if docker exec credex-core-prod test -f "/app/deploy-queue/$TEST_FILE"; then
                echo "   ✅ API container can see the file"
                API_CONTENT=$(docker exec credex-core-prod cat "/app/deploy-queue/$TEST_FILE")
                echo "   📄 File content from API: $API_CONTENT"
            else
                echo "   ❌ API container cannot see the file"
            fi
        fi
    else
        echo "   ❌ Failed to create file from daemon container"
    fi
else
    echo "   ❌ Daemon container not running - cannot test file creation"
fi
echo

# Test 5: List all files in shared volume from both containers
echo "5. Listing shared volume contents..."
if [[ $API_RUNNING -eq 1 ]]; then
    echo "   Files visible from API container:"
    docker exec credex-core-prod ls -la /app/deploy-queue/ | sed 's/^/     /'
else
    echo "   ❌ API container not running"
fi

if [[ $DAEMON_RUNNING -eq 1 ]]; then
    echo "   Files visible from daemon container:"
    docker exec credex-deploy-daemon ls -la /app/deploy-queue/ | sed 's/^/     /'
else
    echo "   ❌ Daemon container not running"
fi
echo

# Test 6: Check Docker volume info
echo "6. Docker volume information..."
VOLUME_NAME="credex-core_deploy-queue"
if docker volume inspect $VOLUME_NAME >/dev/null 2>&1; then
    echo "   ✅ Docker volume '$VOLUME_NAME' exists"
    echo "   Volume details:"
    docker volume inspect $VOLUME_NAME | jq -r '.[0] | "     Driver: \(.Driver)\n     Mountpoint: \(.Mountpoint)\n     Created: \(.CreatedAt)"'
else
    echo "   ❌ Docker volume '$VOLUME_NAME' not found"
    echo "   Available volumes:"
    docker volume ls | grep deploy-queue | sed 's/^/     /'
fi
echo

echo "=== Test Complete ==="
echo "Summary:"
echo "- API Container: $([[ $API_RUNNING -eq 1 ]] && echo "Running" || echo "Not running")"
echo "- Daemon Container: $([[ $DAEMON_RUNNING -eq 1 ]] && echo "Running" || echo "Not running")"
echo "- Volume Communication: $([[ $API_RUNNING -eq 1 && $DAEMON_RUNNING -eq 1 ]] && echo "Ready for testing" || echo "Cannot test - containers not running")"
