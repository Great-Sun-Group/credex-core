# Local CI/CD Pipeline Project Plan

## Background & Current State

### Previous Infrastructure
- **GitHub Actions + Terraform**: Previously deployed to AWS environments
  - `prod` branch → production AWS environment
  - `dev` branch → development AWS environment  
  - Terraform configurations in `terraform/` directory
- **Three Repository Structure**:
  - `credex-core`: Main API and backend services
  - `vimbiso-chatserver`: Chat/messaging service
  - `vimbisopay`: Flutter mobile application

### Current State (Post-Migration)
- **Fully Local Production**: All services now run locally via Docker Compose
- **Zero CI/CD**: Direct deployment from local code changes to production
- **Manual Process**: No automated deployment pipeline
- **Terraform Obsolete**: Infrastructure-as-code no longer relevant for local deployment

### Mobile App Update System (Already Implemented)
- **App Version API**: `/app/version-check` endpoint in credex-core
- **Database Storage**: AppVersion nodes in Neo4j with version metadata
- **Update Logic**: Compares client version with latest, returns update info
- **Direct Distribution**: APK files distributed directly (not through app stores)

## Project Goals

### Primary Objectives
1. **Restore CI/CD Pipeline**: Move from zero CI/CD back to automated deployment
2. **Local-First Approach**: Deploy to local environment, not cloud infrastructure
3. **Independent Service Deployment**: Each repository deploys its service independently
4. **Mobile App Integration**: Include mobile app builds in the pipeline
5. **Documentation Migration**: Move deployment docs from terraform to local process

### Specific Requirements
- **Automatic Deployment**: credex-core and vimbiso-chatserver auto-deploy on push to prod
- **Manual Mobile Deployment**: vimbisopay uses manual workflow dispatch for version control
- **Local Deployment**: Deploy to local Docker environment via API webhooks
- **Mobile Versioning**: Auto-increment versions based on required/optional classification
- **APK Storage**: Store APK files within credex-core and serve via endpoint
- **Documentation**: Update docs structure and archive terraform documentation

## Technical Architecture

### Repository Deployment Flows

#### 1. credex-core Repository
```
Developer → Push to prod → Automatic GitHub Action → Local API deployment
```
- **Trigger**: Automatic on push to prod branch
- **Action**: Call local deployment webhook
- **Result**: Docker Compose rebuilds credex-core service

#### 2. vimbiso-chatserver Repository  
```
Developer → Push to prod → Automatic GitHub Action → Local ChatServer deployment
```
- **Trigger**: Automatic on push to prod branch
- **Action**: Call local deployment webhook
- **Result**: Docker Compose rebuilds chatserver service

#### 3. vimbisopay Repository
```
Developer → Manual workflow dispatch → Build APK → Upload to credex-core → Update database
```
- **Trigger**: Manual workflow dispatch with required/optional input
- **Action**: Build Flutter APK, upload to credex-core, update app version database
- **Versioning**: Auto-increment based on required (minor) vs optional (patch) updates

### Local Deployment Infrastructure

#### New API Endpoints (credex-core)
- `POST /api/deploy-core`: Deploy credex-core service
- `POST /api/deploy-chatserver`: Deploy chatserver service  
- `POST /api/upload-apk`: Upload mobile app APK
- `POST /api/app-version`: Update app version in database
- `GET /api/app-version/latest`: Get current app version
- `GET /downloads/vimbisopay-latest.apk`: Serve APK file

#### Docker Compose Integration
- Services rebuild individually based on deployment target
- Health checks ensure successful deployment
- Maintains existing local environment setup

## Implementation Plan

### Phase 1: Core Infrastructure Setup
1. **Create deployment API endpoints** in credex-core
   - Authentication via deploy tokens
   - Individual service deployment handlers
   - Health check integration
2. **Set up APK storage system**
   - File storage directory in credex-core
   - Upload and serve endpoints
   - Version management integration
3. **Create deployment scripts**
   - Individual service deployment commands
   - Git pull and Docker rebuild logic
   - Error handling and rollback procedures

### Phase 2: GitHub Actions Workflows
1. **credex-core workflow**
   - Automatic trigger on push to prod
   - Webhook call to local deployment API
   - Health check verification
2. **vimbiso-chatserver workflow**
   - Automatic trigger on push to prod
   - Webhook call to local deployment API
   - Health check verification
3. **vimbisopay workflow**
   - Manual dispatch with required/optional input
   - Auto-increment versioning logic
   - Flutter build and APK upload
   - Database version update

### Phase 3: Documentation Migration
1. **Archive terraform documentation**
   - Move `docs/develop/deployment/` terraform content to archive
   - Preserve for historical reference
2. **Create local deployment documentation**
   - Document new workflow processes
   - Include manual deployment commands
   - Update navigation structure
3. **Update main documentation**
   - Reflect new local-first approach
   - Include mobile app deployment process

### Phase 4: Testing & Validation
1. **Test individual service deployments**
   - Verify each service deploys independently
   - Confirm health checks work correctly
2. **Test mobile app pipeline**
   - Verify APK builds and uploads
   - Test version increment logic
   - Validate app update notifications
3. **End-to-end testing**
   - Full deployment cycle for each service
   - Integration testing between services

## Technical Specifications

### Mobile App Versioning Logic
```
Current Version: X.Y.Z

Optional Update (update_required: false):
- Increment patch: X.Y.(Z+1)
- Example: 1.2.3 → 1.2.4

Required Update (update_required: true):  
- Increment minor, reset patch: X.(Y+1).0
- Example: 1.2.3 → 1.3.0
```

### Deployment Authentication
- **Deploy Tokens**: Secure tokens for GitHub Actions to call local APIs
- **Environment Variables**: Store tokens in GitHub repository secrets
- **Local Validation**: Verify token authenticity in deployment endpoints

### File Structure Changes
```
credex-core/
├── vimbisopay_apk/           # New: Mobile app APK storage
├── docs/
│   └── develop/
│       ├── deployment/    # Updated: Local deployment docs
│       └── archive/       # New: Archived terraform docs
└── src/api/
    └── deployment/        # New: Deployment API endpoints
```

## Success Criteria

### Functional Requirements
- [ ] Each repository can deploy independently via GitHub Actions
- [ ] Local Docker services rebuild correctly on deployment
- [ ] Mobile app builds and uploads APK automatically
- [ ] App version database updates with correct metadata
- [ ] Users receive update notifications with proper required/optional flags

### Non-Functional Requirements
- [ ] Deployment process completes within 5 minutes per service
- [ ] Zero downtime for service updates (Docker rolling updates)
- [ ] Rollback capability for failed deployments
- [ ] Comprehensive logging for all deployment activities
- [ ] Documentation reflects new processes accurately

## Risk Mitigation

### Potential Issues
1. **Local Environment Dependencies**: Ensure local Docker environment is stable
2. **Network Connectivity**: GitHub Actions must reach local deployment APIs
3. **Version Conflicts**: Handle cases where version increment logic fails
4. **Service Dependencies**: Manage interdependencies between services during deployment

### Mitigation Strategies
1. **Health Checks**: Comprehensive health validation before marking deployment successful
2. **Rollback Procedures**: Automated rollback on deployment failure
3. **Monitoring**: Real-time monitoring of deployment processes
4. **Documentation**: Clear troubleshooting guides for common issues

This project will restore automated deployment capabilities while maintaining the local-first approach, providing a robust CI/CD pipeline tailored to the current infrastructure needs.
