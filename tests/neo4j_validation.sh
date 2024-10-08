#!/bin/bash

# Neo4j Validation Tests

set -e

# Function to run a Cypher query
run_cypher_query() {
    local host=$1
    local user=$2
    local password=$3
    local query=$4
    
    cypher-shell -a "$host" -u "$user" -p "$password" "$query"
}

# Function to check Neo4j version and edition
check_neo4j_version() {
    local host=$1
    local user=$2
    local password=$3
    
    echo "Checking Neo4j version and edition..."
    result=$(run_cypher_query "$host" "$user" "$password" "CALL dbms.components() YIELD name, edition, version")
    
    if [[ $result == *"enterprise"* ]]; then
        echo "Neo4j Enterprise Edition confirmed."
    else
        echo "Error: Neo4j Enterprise Edition not detected."
        exit 1
    fi
}

# Function to validate instance count
validate_instance_count() {
    local environment=$1
    local expected_count=$2
    
    echo "Validating instance count for $environment environment..."
    actual_count=$(aws ec2 describe-instances --filters "Name=tag:Environment,Values=$environment" "Name=tag:Project,Values=CredEx" --query 'Reservations[*].Instances[*]' --output text | wc -l)
    
    if [ "$actual_count" -eq "$expected_count" ]; then
        echo "Instance count for $environment is correct: $actual_count"
    else
        echo "Error: Expected $expected_count instances for $environment, but found $actual_count"
        exit 1
    fi
}

# Function to check security group rules
check_security_group_rules() {
    local environment=$1
    
    echo "Checking security group rules for $environment environment..."
    sg_id=$(aws ec2 describe-security-groups --filters "Name=tag:Environment,Values=$environment" "Name=tag:Project,Values=CredEx" --query 'SecurityGroups[0].GroupId' --output text)
    
    if [ "$environment" == "production" ]; then
        expected_cidr="10.0.0.0/16"  # Adjust this to match your VPC CIDR
    else
        expected_cidr="10.0.0.0/8"
    fi
    
    rules=$(aws ec2 describe-security-group-rules --filter "Name=group-id,Values=$sg_id" --query 'SecurityGroupRules[?IpProtocol==`tcp`].[FromPort,ToPort,CidrIpv4]' --output text)
    
    if [[ $rules == *"7474 7474 $expected_cidr"* ]] && [[ $rules == *"7687 7687 $expected_cidr"* ]]; then
        echo "Security group rules for $environment are correctly configured."
    else
        echo "Error: Security group rules for $environment are not correctly configured."
        exit 1
    fi
}

# Main test execution
main() {
    local environments=("development" "staging" "production")
    local instance_counts=(2 1 2)
    
    for i in "${!environments[@]}"; do
        env=${environments[$i]}
        count=${instance_counts[$i]}
        
        echo "Testing $env environment..."
        validate_instance_count "$env" "$count"
        check_security_group_rules "$env"
        
        # Assuming we have a way to get Neo4j host, user, and password for each environment
        # This could be retrieved from AWS Secrets Manager or passed as arguments
        host="neo4j-$env.example.com"
        user="neo4j"
        password="password"  # In practice, use a secure method to retrieve this
        
        check_neo4j_version "$host" "$user" "$password"
        
        echo "$env environment tests completed successfully."
        echo
    done
    
    echo "All tests completed successfully!"
}

# Run the main function
main
