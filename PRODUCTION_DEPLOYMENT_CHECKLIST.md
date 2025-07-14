# Production Deployment Checklist

## 🔐 Security Setup (COMPLETED)
- ✅ `.env.prod` and `.env.prod.local` are in .gitignore
- ✅ `.env.prod.example` template created with placeholder values
- ✅ Production secrets will be kept out of version control

## 📋 Pre-Deployment Steps

### 1. Create Production Environment File
```bash
# Copy the template to create your actual production environment file
cp .env.prod.example .env.prod.local
```

### 2. Configure Production Secrets
Edit `.env.prod.local` and replace ALL placeholder values:

#### 🔑 Critical Security Keys (MUST CHANGE):
```bash
# Generate strong random strings for these:
JWT_SECRET_PROD=your-super-secure-jwt-secret-at-least-32-chars
CLIENT_API_KEY_PROD=your-unique-client-api-key-for-production
PASSWORD_PEPPER_PROD=your-password-pepper-for-extra-security
DJANGO_SECRET_PROD=your-django-secret-key-50-chars-minimum
```

#### 📄 Neo4j License (same as dev):
```bash
NEO4J_ENTERPRISE_LICENSE=your_existing_neo4j_license
```

#### 📱 WhatsApp Production Credentials:
```bash
WHATSAPP_API_URL=https://graph.facebook.com/v18.0/
WHATSAPP_ACCESS_TOKEN=your_production_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_production_phone_number_id
WHATSAPP_BUSINESS_ID=your_production_business_account_id
CREDEX_CORE_WHATSAPP_API_KEY=your_production_whatsapp_api_key
CREDEX_CORE_WHATSAPP_BUSINESS_ID=your_production_whatsapp_business_id
CREDEX_CORE_WHATSAPP_PHONE_ID=your_production_whatsapp_phone_id
```

#### 🔥 Firebase Production Credentials:
```bash
FIREBASE_PROJECT_ID=your-production-firebase-project
FIREBASE_CLIENT_EMAIL=your-production-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Production Key\n-----END PRIVATE KEY-----"
```

#### ☁️ AWS Configuration (Optional - for cloud backups):
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=af-south-1
AWS_S3_BACKUP_BUCKET=your-backup-bucket-name
```

## 🚀 Deployment Commands

### 1. Start Production Environment
```bash
# Start all production services
docker compose -f docker-compose.prod.yml --env-file .env.prod.local up -d

# Check service status
docker compose -f docker-compose.prod.yml ps
```

### 2. Verify Services Are Running
```bash
# Check all containers are healthy
docker compose -f docker-compose.prod.yml ps

# Check logs for any errors
docker compose -f docker-compose.prod.yml logs
```

## 🔍 Health Checks

### Production Service URLs:
- **Credex Core API**: http://localhost:4000
- **API Documentation**: http://localhost:4000/api-docs
- **Vimbiso ChatServer**: http://localhost:9000
- **ChatServer Health**: http://localhost:9000/health/
- **Neo4j Ledger Browser**: http://localhost:7476
- **Neo4j Search Browser**: http://localhost:7477
- **System Monitor**: http://localhost:9100

### Command Line Health Checks:
```bash
# Test Credex Core API
curl http://localhost:4000/api-docs

# Test Vimbiso ChatServer
curl http://localhost:9000/health/

# Test Neo4j Ledger connection
docker exec credex-neo4j-ledger-prod cypher-shell -u neo4j -p password "RETURN 'Ledger OK'"

# Test Neo4j Search connection
docker exec credex-neo4j-search-prod cypher-shell -u neo4j -p password "RETURN 'Search OK'"

# Test Redis connection
docker exec vimbiso-redis-state-prod redis-cli ping
```

## 🛡️ Backup System Verification

### Check Backup Service:
```bash
# Check backup service is running
docker logs credex-backup-service

# Trigger manual backup test
docker exec credex-backup-service /scripts/integrated-backup.sh daily

# Check backup directories were created
ls -la ./backups/
```

### Backup Schedule Verification:
- **Hourly**: Every 2 hours - Transaction logs, Redis state
- **Daily**: 1 AM UTC - Full database backup
- **Weekly**: Sunday 2 AM UTC - Complete system backup
- **Maintenance**: Midnight UTC - Full backup + system maintenance
- **Post-MTQ**: After MTQ completion - Transaction logs
- **Post-DCO**: After DCO completion - Full backup + exchange rates

## 📊 Monitoring Setup

### System Resources:
```bash
# Check Docker resource usage
docker stats --no-stream

# Check disk space
df -h

# Check memory usage
free -h
```

### Service Monitoring:
- Visit http://localhost:9100 for system metrics
- Monitor backup logs: `docker logs credex-backup-service --tail 50`
- Check application logs: `docker compose -f docker-compose.prod.yml logs -f`

## 🔧 Port Configuration

| Service | Development | Production |
|---------|-------------|------------|
| Credex Core API | 3000 | 4000 |
| Vimbiso ChatServer | 8000 | 9000 |
| Neo4j Ledger HTTP | 7474 | 7476 |
| Neo4j Ledger Bolt | 7687 | 7689 |
| Neo4j Search HTTP | 7475 | 7477 |
| Neo4j Search Bolt | 7688 | 7690 |
| Redis | 6379 | 6380 |
| System Monitor | - | 9100 |

## 🚨 Troubleshooting

### If Services Won't Start:
```bash
# Check logs for errors
docker compose -f docker-compose.prod.yml logs

# Check individual service logs
docker logs credex-core-prod
docker logs vimbiso-chatserver-prod
docker logs credex-neo4j-ledger-prod

# Check resource usage
docker stats

# Restart specific service
docker compose -f docker-compose.prod.yml restart credex-core-prod
```

### If Backup Issues:
```bash
# Check backup service logs
docker logs credex-backup-service

# Test manual backup
docker exec credex-backup-service /scripts/integrated-backup.sh daily

# Check backup directory permissions
ls -la ./backups/
```

## 🌐 External Access (Optional)

### For WhatsApp Webhooks or External API Access:

1. **Set up Dynamic DNS** (recommended: DuckDNS)
2. **Configure Router Port Forwarding**:
   - Forward port 4000 → Production Credex Core
   - Forward port 9000 → Production Vimbiso ChatServer
3. **Update WhatsApp webhook URLs** to use your dynamic DNS domain
4. **Consider SSL certificates** for HTTPS (Let's Encrypt + nginx proxy)

## ✅ Post-Deployment Checklist

- [ ] All services are running and healthy
- [ ] Health check URLs respond correctly
- [ ] Backup system is operational
- [ ] System monitoring is accessible
- [ ] Production logs are clean (no errors)
- [ ] Resource usage is within acceptable limits
- [ ] External access configured (if needed)
- [ ] WhatsApp webhooks updated (if applicable)

## 📞 Daily Operations

### Morning Checklist:
1. Check service health: `docker compose -f docker-compose.prod.yml ps`
2. Review backup logs: `docker logs credex-backup-service --tail 50`
3. Check disk space: `df -h`
4. Monitor system resources: Visit http://localhost:9100

### Maintenance Window (Midnight UTC):
- Automatic full system backup
- Docker system cleanup
- Log rotation
- Database optimization
- System health checks

---

## 🎯 Ready to Deploy?

Once you've completed the environment configuration above, you're ready to deploy! The integrated backup system will automatically protect your data during MTQ and DCO operations, and the comprehensive monitoring will help you keep track of system health.

Remember: The production environment runs completely isolated from development, so you can continue developing while production runs safely alongside.
