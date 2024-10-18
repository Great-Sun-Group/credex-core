# Debugging ECS Deployment Issues

This document provides guidance on debugging ECS deployment issues for the Credex application. If you encounter problems with the deployment process, you can add these debugging steps to the `deploy_application.yml` workflow.

## Enhanced Deployment Step

Replace the simple deployment step in `deploy_application.yml` with this enhanced version for more detailed logging and debugging:

```yaml
- name: Deploy Application
  run: |
    echo "Deploying application to $ENVIRONMENT from branch ${{ github.ref_name }}"
    TASK_DEF_ARN=$(aws ecs describe-task-definition --task-definition credex-core-${{ env.ENVIRONMENT }} --query 'taskDefinition.taskDefinitionArn' --output text)
    aws ecs update-service --cluster credex-cluster-${{ env.ENVIRONMENT }} --service credex-core-service-${{ env.ENVIRONMENT }} --task-definition $TASK_DEF_ARN --force-new-deployment

    echo "Waiting for service to stabilize (this may take up to 30 minutes)..."

    start_time=$(date +%s)
    timeout=1800  # 30 minutes in seconds

    while true; do
      current_time=$(date +%s)
      elapsed_time=$((current_time - start_time))
      
      if [ $elapsed_time -ge $timeout ]; then
        echo "Timeout reached. Service did not stabilize within 30 minutes."
        break
      fi
      
      service_status=$(aws ecs describe-services --cluster credex-cluster-${{ env.ENVIRONMENT }} --services credex-core-service-${{ env.ENVIRONMENT }} --query 'services[0].{status: status, runningCount: runningCount, desiredCount: desiredCount, events: events[0:10]}')
      
      status=$(echo $service_status | jq -r '.status')
      running_count=$(echo $service_status | jq -r '.runningCount')
      desired_count=$(echo $service_status | jq -r '.desiredCount')
      
      echo "Service status: $status, Running tasks: $running_count/$desired_count"
      echo "Recent service events:"
      echo $service_status | jq -r '.events[] | "  \(.createdAt): \(.message)"'
      
      if [ "$status" == "ACTIVE" ] && [ "$running_count" -eq "$desired_count" ]; then
        echo "Service has stabilized successfully"
        exit 0
      fi
      
      # Additional debugging steps here (see sections below)
      
      sleep 30
    done

    echo "Service did not stabilize within the expected time. Deployment failed."
    # Additional failure handling steps here (see sections below)
    exit 1
```

## Debugging Steps

Add these steps within the deployment loop for more detailed debugging information:

### Check Task Status and Logs

```bash
# Get all task ARNs for the service
TASK_ARNS=$(aws ecs list-tasks --cluster credex-cluster-${{ env.ENVIRONMENT }} --service-name credex-core-service-${{ env.ENVIRONMENT }} --query 'taskArns[]' --output text)

if [ -n "$TASK_ARNS" ]; then
  echo "Tasks found for the service:"
  
  # Get detailed task information for all tasks
  TASK_DETAILS=$(aws ecs describe-tasks --cluster credex-cluster-${{ env.ENVIRONMENT }} --tasks $TASK_ARNS)
  
  echo "$TASK_DETAILS" | jq -r '.tasks[] | "Task ARN: \(.taskArn)\nLast Status: \(.lastStatus)\nDesired Status: \(.desiredStatus)\nHealth Status: \(.healthStatus)\nTask Definition: \(.taskDefinitionArn)\nLaunch Type: \(.launchType)\nContainer Instance: \(.containerInstanceArn)\nStopped Reason: \(.stoppedReason)\nStopped At: \(.stoppedAt)\nStarted At: \(.startedAt)\n"'
  
  # Check for stopped tasks and their reasons
  STOPPED_TASKS=$(echo "$TASK_DETAILS" | jq -r '.tasks[] | select(.lastStatus == "STOPPED")')
  if [ -n "$STOPPED_TASKS" ]; then
    echo "Stopped tasks found:"
    echo "$STOPPED_TASKS" | jq -r '. | "Task ARN: \(.taskArn)\nStopped Reason: \(.stoppedReason)\nContainer Exit Codes: \(.containers[].exitCode)\nContainer Reason: \(.containers[].reason)\nStopped At: \(.stoppedAt)\n"'
    
    # Get container logs for stopped tasks
    echo "$STOPPED_TASKS" | jq -r '.containers[] | select(.runtimeId != null) | "Container ID: \(.runtimeId)\nContainer Name: \(.name)\nLogs:"' | while read -r line; do
      if [[ $line == Container* ]]; then
        echo "$line"
      elif [[ $line == Logs:* ]]; then
        CONTAINER_ID=$(echo "$line" | awk '{print $3}')
        aws logs get-log-events --log-group-name /ecs/credex-core-${{ env.ENVIRONMENT }} --log-stream-name ecs/credex-core/$CONTAINER_ID --limit 100 | jq -r '.events[].message'
        echo ""
      fi
    done
  fi
  
  # Get container logs for running tasks
  echo "$TASK_DETAILS" | jq -r '.tasks[] | select(.lastStatus == "RUNNING") | .containers[] | select(.runtimeId != null) | "Container ID: \(.runtimeId)\nContainer Name: \(.name)\nLogs:"' | while read -r line; do
    if [[ $line == Container* ]]; then
      echo "$line"
    elif [[ $line == Logs:* ]]; then
      CONTAINER_ID=$(echo "$line" | awk '{print $3}')
      aws logs get-log-events --log-group-name /ecs/credex-core-${{ env.ENVIRONMENT }} --log-stream-name ecs/credex-core/$CONTAINER_ID --limit 100 | jq -r '.events[].message'
      echo ""
    fi
  done
else
  echo "No tasks found for the service"
fi
```

### Check ECS Service Events

```bash
echo "ECS Service Events:"
aws ecs describe-services --cluster credex-cluster-${{ env.ENVIRONMENT }} --services credex-core-service-${{ env.ENVIRONMENT }} --query 'services[0].events[0:10]' | jq -r '.[] | "\(.createdAt): \(.message)"'
```

### Check ECS Cluster Capacity and Settings

```bash
echo "ECS Cluster Capacity Providers:"
aws ecs describe-clusters --clusters credex-cluster-${{ env.ENVIRONMENT }} --include ATTACHMENTS --query 'clusters[0].attachments' | jq .

echo "ECS Cluster Settings:"
aws ecs describe-clusters --clusters credex-cluster-${{ env.ENVIRONMENT }} --include SETTINGS --query 'clusters[0].settings' | jq .
```

## Failure Handling

If the deployment fails, add these steps to gather more information:

```bash
# Fetch and display the latest task definition
echo "Latest Task Definition:"
aws ecs describe-task-definition --task-definition $TASK_DEF_ARN | jq .

# Display VPC and Subnet information
echo "VPC and Subnet Information:"
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=credex-vpc-${{ env.ENVIRONMENT }}" | jq .
aws ec2 describe-subnets --filters "Name=vpc-id,Values=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=credex-vpc-${{ env.ENVIRONMENT }}" --query 'Vpcs[0].VpcId' --output text)" | jq .

# Display Security Group information
echo "Security Group Information:"
aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=credex-vpc-${{ env.ENVIRONMENT }}" --query 'Vpcs[0].VpcId' --output text)" | jq .

# Display IAM Role information
echo "IAM Role Information:"
aws iam get-role --role-name ecsTaskExecutionRole | jq .

# Check ECS Task Execution Role permissions
echo "ECS Task Execution Role Permissions:"
aws iam list-role-policies --role-name ecsTaskExecutionRole
aws iam list-attached-role-policies --role-name ecsTaskExecutionRole
```

## Troubleshooting Tips

1. **Container Logs**: Check the container logs for application-specific errors.
2. **Task Status**: Look for tasks that are stopping or failing to start.
3. **Service Events**: Review recent service events for clues about deployment issues.
4. **Cluster Capacity**: Ensure the ECS cluster has sufficient capacity to run the new tasks.
5. **Networking**: Verify VPC, subnet, and security group configurations.
6. **IAM Roles**: Check that the ECS task execution role has the necessary permissions.
7. **Resource Constraints**: Ensure the task definition doesn't exceed available resources (CPU, memory).

By incorporating these debugging steps and reviewing the resulting logs, you can gain deeper insights into deployment issues and resolve them more effectively.
