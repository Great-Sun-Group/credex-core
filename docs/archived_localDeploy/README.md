# Archived Markdown Documentation

This directory contains markdown documentation files that were previously in the root directory but have been archived as part of the documentation cleanup and migration to HTML structure.

## Background

As part of the Local CI/CD Pipeline Project (Phase 3 - Documentation Migration), these markdown files have been either:
1. **Integrated into HTML documentation** - Content moved to structured HTML pages in `/docs/develop/`
2. **Made obsolete by new workflows** - Replaced by automated CI/CD processes
3. **Completed migrations** - Historical documentation no longer needed

## Archived Files

### Files Integrated into HTML Documentation

These files have been converted to HTML and integrated into the main documentation structure:

- `DEV_VERIFICATION_SETUP.md` → `/docs/develop/dev_verification_setup.html`
- `VIMBISO_SETUP_SUMMARY.md` → `/docs/develop/vimbiso_dev_setup.html`
- `PROD_LOCAL_URLS.md` → `/docs/develop/production_urls.html`
- `CLOUDFLARE_TUNNEL_DEPLOYMENT_SUMMARY.md` → `/docs/develop/external_access_setup.html`
- `TUNNEL_STATUS_SUMMARY.md` → `/docs/develop/external_access_setup.html`
- `VIMBISO_CO_ZW_SETUP_INSTRUCTIONS.md` → `/docs/develop/external_access_setup.html`
- `VIMBISO_DNS_FIX_INSTRUCTIONS.md` → `/docs/develop/external_access_setup.html`

### Files Made Obsolete by CI/CD Workflows

These files contained manual deployment instructions that are no longer relevant with the automated CI/CD pipeline:

- `PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Manual deployment checklist (replaced by GitHub Actions workflows)
- `QUICK_PRODUCTION_COMMANDS.md` - Manual deployment commands (replaced by automated deployment)

### Historical Migration Documentation

These files documented completed migrations and are preserved for historical reference:

- `NEO4J_AURA_MIGRATION_SUMMARY.md` - Neo4j Aura migration (completed January 2025)

## Current Documentation Structure

The active documentation is now organized in HTML format:

### Development Environment
- `/docs/develop/dev_env_setup.html` - Development environment setup
- `/docs/develop/vimbiso_dev_setup.html` - Vimbiso ChatServer development setup
- `/docs/develop/dev_verification_setup.html` - Development verification setup

### Production Environment
- `/docs/develop/production_urls.html` - Production environment URLs and monitoring
- `/docs/develop/external_access_setup.html` - Cloudflare tunnels and external access

### Deployment
- `/docs/develop/deployment/local-deployment-guide.html` - Local CI/CD pipeline guide
- `/docs/develop/deployment/same_server_production.html` - Same-server production deployment

## Migration Benefits

1. **Unified Structure** - All documentation now follows consistent HTML template system
2. **Better Navigation** - Integrated into main documentation navigation
3. **Improved Maintenance** - Single source of truth in HTML format
4. **CI/CD Alignment** - Documentation reflects automated deployment processes
5. **Historical Preservation** - Original markdown files preserved for reference

## Access to Archived Content

If you need to reference the original markdown content, all files are preserved in this directory. However, the HTML versions in `/docs/develop/` are now the authoritative documentation and should be used for current operations.

---

**Archive Date**: August 1, 2025  
**Migration Phase**: Phase 3 - Documentation Migration  
**Status**: ✅ Archived - Content Integrated into HTML Documentation
