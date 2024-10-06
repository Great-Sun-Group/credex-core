#!/bin/bash
# Update and install necessary packages
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common

# Add Neo4j repository
curl -fsSL https://debian.neo4j.com/neotechnology.gpg.key | sudo apt-key add -
sudo add-apt-repository "deb https://debian.neo4j.com stable 4.4"

# Install Neo4j
sudo apt-get update
sudo apt-get install -y neo4j

# Configure Neo4j
sudo sed -i 's/#dbms.security.auth_enabled=false/dbms.security.auth_enabled=true/' /etc/neo4j/neo4j.conf
sudo sed -i 's/#dbms.default_listen_address=0.0.0.0/dbms.default_listen_address=0.0.0.0/' /etc/neo4j/neo4j.conf

# Set Neo4j password
sudo neo4j-admin set-initial-password ${neo4j_password}

# Start Neo4j service
sudo systemctl enable neo4j
sudo systemctl start neo4j

# Create Neo4j user
cypher-shell -u neo4j -p ${neo4j_password} "CREATE USER ${neo4j_username} SET PASSWORD '${neo4j_password}' SET STATUS ACTIVE"
cypher-shell -u neo4j -p ${neo4j_password} "GRANT ROLE admin TO ${neo4j_username}"