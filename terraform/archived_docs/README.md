# Archived Terraform Documentation

This directory contains documentation files that were previously part of the main documentation structure but have been archived as part of the migration from AWS-based infrastructure to local deployment.

## Background

The Credex Core project previously used AWS infrastructure managed by Terraform for deployment. As of August 2025, the project has migrated to a local-first deployment approach using Docker Compose and GitHub Actions workflows that deploy directly to local environments.

## Archived Files

The following documentation files have been moved here for historical reference:

### AWS Terraform Workflows
- `app_workflow.html` - Application deployment workflow using AWS ECS and Terraform
- `connectors_workflow.html` - AWS infrastructure setup (VPC, ALB, security groups, etc.)
- `databases_workflow.html` - Neo4j database deployment on AWS EC2 instances
- `terraform_usage.html` - General Terraform usage guide for AWS deployments

### AWS Infrastructure Documentation
- `instance_sizing.html` - AWS instance sizing overview and recommendations
- `instance_sizing_costs.html` - Cost analysis for AWS infrastructure
- `instance_sizing_scaling.html` - Scaling strategies for AWS deployments
- `instance_sizing_technical.html` - Technical specifications for AWS instances
- `storage_configuration.html` - S3 storage structure for ID verification data

### Configuration Files
- `credex-core-permissions.json` - AWS IAM permissions configuration

## Current Deployment Approach

The project now uses a local CI/CD pipeline with the following components:

1. **Local Deployment API** - Endpoints in credex-core for deploying services locally
2. **GitHub Actions Workflows** - Automated deployment triggers for each repository
3. **Docker Compose** - Local service orchestration replacing AWS ECS
4. **Local File Storage** - Direct file storage replacing S3

## Active Documentation

For current deployment documentation, see:

- `/docs/develop/deployment/local-deployment-guide.html` - Complete guide to the new local CI/CD pipeline
- `/docs/develop/deployment/same_server_production.html` - Same-server production deployment guide
- `/docs/develop/deployment/neo4j_license.html` - Neo4j license management (still relevant)

## Migration Notes

- **Terraform configurations** remain in the `/terraform/` directory for reference
- **AWS workflows** have been moved to `/terraform/workflows/` 
- **Local deployment** is now the primary deployment method
- **Cloud migration path** is still available if needed in the future

## Historical Context

These files represent the Phase 1 infrastructure that supported:
- Multi-environment deployments (dev, staging, production)
- AWS ECS container orchestration
- CloudFront content delivery
- Auto-scaling and load balancing
- S3-based storage and backups

The migration to local deployment was completed as part of the Local CI/CD Pipeline Project (Phase 2), documented in `/projects/localPipeline.md`.

---

**Archive Date**: August 1, 2025  
**Migration Phase**: Phase 3 - Documentation Migration  
**Status**: ✅ Archived - Preserved for Historical Reference
