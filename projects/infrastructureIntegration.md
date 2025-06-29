# Vimbiso-Chatserver Integration with Credex-Core: Workplan

## Overview

This document outlines the plan to integrate the vimbiso-chatserver infrastructure with credex-core to reduce deployment costs and complexity while maintaining service separation. The integration will be performed in phases, with the initial phase focusing on uniting the architecture while still communicating over the open internet.

## Current Architecture

**Credex-Core:**
- TypeScript/Express application
- Deployed on AWS ECS Fargate
- Uses Neo4j for data persistence
- Communicates with external services via API

**Vimbiso-Chatserver:**
- Python/Django application
- Deployed on separate AWS ECS Fargate
- Uses Redis for state management
- Communicates with Credex-Core via open internet API

## Target Architecture (Phase 1)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Shared AWS Infrastructure                   │
├─────────────────────────────────┬───────────────────────────────┤
│         Credex-Core ECS         │     Vimbiso-Chatserver ECS    │
│                                 │                               │
│  ┌─────────────┐                │               ┌─────────────┐ │
│  │ Credex-Core │                │               │ Redis       │ │
│  │ Container   │                │               │ Container   │ │
│  └─────────────┘                │               └─────────────┘ │
│         ▲                       │                      ▲        │
│         │                       │                      │        │
│         ▼                       │                      ▼        │
│  ┌─────────────┐                │               ┌─────────────┐ │
│  │ Neo4j       │                │               │ Chatserver  │ │
│  │ Database    │                │               │ Container   │ │
│  └─────────────┘                │               └─────────────┘ │
└─────────────────────────────────┴───────────────────────────────┘
                    ▲                           ▲
                    │                           │
                    ▼                           ▼
         ┌─────────────────────┐    ┌─────────────────────┐
         │ Application Load    │    │ WhatsApp Cloud API  │
         │ Balancer            │    │                     │
         └─────────────────────┘    └─────────────────────┘
                    ▲
                    │
                    ▼
         ┌─────────────────────┐
         │ Internet / Users    │
         └─────────────────────┘
```

**Key Changes:**
1. Both services will run in the same AWS account and region
2. Shared networking infrastructure (VPC, subnets, security groups)
3. Single Application Load Balancer with path-based routing
4. Shared IAM roles and policies where appropriate
5. Unified monitoring and logging
6. Services will still communicate via API over the internet initially

## Phase 1: Infrastructure Integration Workplan

### 1. Preparation and Analysis (Week 1)

- [x] Analyze current Terraform configurations for both services
- [x] Identify shared resources and integration points
- [x] Document environment variables and secrets requirements
- [ ] Create backup of current infrastructure state
- [ ] Define target architecture and resource allocation

### 2. Terraform Modifications (Week 2)

#### 2.1 Update Base Infrastructure

- [ ] Modify VPC and networking configuration to support both services
- [ ] Update security groups to allow appropriate traffic
- [ ] Configure shared IAM roles with appropriate permissions
- [ ] Set up shared monitoring and logging resources

#### 2.2 Create Chatbot Module

- [ ] Create new Terraform module for chatbot service
- [ ] Configure ECS task definition with appropriate resources
- [ ] Set up auto-scaling policies
- [ ] Configure health checks and monitoring

#### 2.3 Update Load Balancer Configuration

- [ ] Configure path-based routing for the shared ALB
- [ ] Set up target groups for both services
- [ ] Configure health checks and SSL termination
- [ ] Update DNS records to point to the shared ALB

### 3. Container Image Preparation (Week 2)

- [ ] Create ECR repositories for chatbot and Redis
- [ ] Build and push container images
- [ ] Test container images locally
- [ ] Update task definitions to use new container images

### 4. Deployment Planning (Week 3)

- [ ] Create detailed deployment runbook
- [ ] Define rollback procedures
- [ ] Schedule maintenance window
- [ ] Notify stakeholders of upcoming changes

### 5. Deployment Execution (Week 3)

- [ ] Apply Terraform changes in staging environment
- [ ] Validate infrastructure changes
- [ ] Deploy container images
- [ ] Verify service health and functionality
- [ ] Update DNS records

### 6. Testing and Validation (Week 3-4)

- [ ] Verify end-to-end functionality
- [ ] Test WhatsApp integration
- [ ] Validate monitoring and alerting
- [ ] Perform load testing
- [ ] Verify backup and recovery procedures

### 7. Production Deployment (Week 4)

- [ ] Apply Terraform changes in production environment
- [ ] Deploy container images
- [ ] Verify service health and functionality
- [ ] Update DNS records
- [ ] Monitor for issues

### 8. Post-Deployment Activities (Week 4-5)

- [ ] Document final architecture
- [ ] Update runbooks and documentation
- [ ] Train operations team on new architecture
- [ ] Decommission old infrastructure
- [ ] Conduct post-implementation review

## Phase 2: Internal Communication (Future Work)

In a future phase, we will modify the services to communicate internally rather than over the open internet:

- Modify chatbot code to use internal endpoints
- Implement service discovery
- Update security groups to allow internal communication
- Remove external API endpoints
- Implement internal authentication mechanism

## Resource Requirements

### Infrastructure

| Resource | Current (Separate) | Target (Combined) | Notes |
|----------|-------------------|-------------------|-------|
| ECS Clusters | 2 | 1 | Single cluster with multiple services |
| VPCs | 2 | 1 | Shared VPC with appropriate subnets |
| ALBs | 2 | 1 | Single ALB with path-based routing |
| NAT Gateways | 2-4 | 2 | Reduced NAT gateways in non-prod |
| ECR Repositories | 2 | 3 | One for each service + Redis |

### Compute Resources

| Service | CPU | Memory | Min Instances | Max Instances |
|---------|-----|--------|--------------|---------------|
| Credex-Core | 1024 | 2048 | 1 | 4 |
| Vimbiso-Chatserver | 1024 | 2048 | 1 | 2 |
| Redis (for Chatserver) | 256 | 384 | 1 | 1 |

**Note:** There is no Redis service in the current credex-core architecture. The Redis container mentioned in the analysis is only required for the vimbiso-chatserver and will be deployed as a sidecar container in the chatbot ECS task.

## Environment Variables

### Credex-Core (Existing)

```
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
...existing variables...
```

### Vimbiso-Chatserver (To Be Added)

```
DJANGO_ENV=production
DJANGO_SECRET=<secret>
MYCREDEX_APP_URL=https://api.mycredex.dev
CLIENT_API_KEY=<api_key>
WHATSAPP_API_URL=https://graph.facebook.com/v22.0/
WHATSAPP_ACCESS_TOKEN=<token>
WHATSAPP_PHONE_NUMBER_ID=<phone_id>
WHATSAPP_BUSINESS_ID=<business_id>
REDIS_URL=redis://localhost:6379/0
ALLOWED_HOSTS=*
DEBUG=false
APP_LOG_LEVEL=INFO
DJANGO_LOG_LEVEL=INFO
```

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Service disruption during migration | High | Medium | Detailed runbook, maintenance window, rollback plan |
| Resource contention between services | Medium | Medium | Proper resource allocation, monitoring, auto-scaling |
| Security group misconfiguration | High | Low | Thorough testing, principle of least privilege |
| Increased blast radius for security incidents | High | Low | Proper isolation, least privilege, monitoring |
| Deployment coordination complexity | Medium | Medium | CI/CD pipeline updates, deployment documentation |

## Success Criteria

1. Both services running on shared infrastructure
2. No degradation in service performance or availability
3. Successful WhatsApp message processing
4. Reduced infrastructure costs
5. Simplified operational management
6. Comprehensive monitoring and alerting

## Cost Analysis

| Category | Current Cost (Monthly) | Projected Cost (Monthly) | Savings |
|----------|------------------------|--------------------------|---------|
| ECS Fargate | ~$150 | ~$120 | $30 |
| Load Balancer | ~$40 | ~$20 | $20 |
| NAT Gateway | ~$80 | ~$40 | $40 |
| Data Transfer | ~$30 | ~$20 | $10 |
| **Total** | **~$300** | **~$200** | **~$100** |

## Next Steps

1. Review and approve this workplan
2. Set up project tracking in JIRA/GitHub
3. Schedule kickoff meeting with development and operations teams
4. Begin preparation and analysis phase
