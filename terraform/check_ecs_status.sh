#!/bin/bash

# Check if cluster name and service name are provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 <cluster_name> <service_name>"
    exit 1
fi

CLUSTER_NAME=$1
SERVICE_NAME=$2
AWS_REGION="af-south-1"

# Get the service status
service_status=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].status' --output text)
echo "Service status: $service_status"

# Get the number of running tasks
running_tasks=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].runningCount' --output text)
echo "Number of running tasks: $running_tasks"

# Get the task definition
task_definition=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].taskDefinition' --output text)
echo "Current task definition: $task_definition"

# List the tasks
tasks=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --region $AWS_REGION --query 'taskArns[]' --output text)

# Check each task's status
for task in $tasks; do
    task_status=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $task --region $AWS_REGION --query 'tasks[0].lastStatus' --output text)
    echo "Task $task status: $task_status"
done

# Check if the number of running tasks matches the desired count
desired_count=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].desiredCount' --output text)
if [ "$running_tasks" -eq "$desired_count" ]; then
    echo "ECS service is healthy: Running tasks ($running_tasks) match desired count ($desired_count)"
    exit 0
else
    echo "ECS service is unhealthy: Running tasks ($running_tasks) do not match desired count ($desired_count)"
    exit 1
fi