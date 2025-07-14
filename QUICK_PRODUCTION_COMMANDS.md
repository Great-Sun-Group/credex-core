# Quick Production Commands Reference

## 🚀 Essential Commands

### Start Production
```bash
# Copy environment template (first time only)
cp .env.prod.example .env.prod.local

# Edit your production secrets
# (Edit .env.prod.local with your actual values)

# Start production environment
docker compose -f docker-compose.prod.yml --env-file .env.prod.local up -d
```

### Check Status
```bash
# Check all services
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

### Health Checks
```bash
# Quick health check URLs
curl http://localhost:4000/api-docs    # Credex Core
curl http://localhost:9000/health/     # Vimbiso ChatServer

# Database connections
docker exec credex-neo4j-ledger-prod cypher-shell -u neo4j -p password "RETURN 'OK'"
docker exec vimbiso-redis-state-prod redis-cli ping
```

### Backup Commands
```bash
# Check backup service
docker logs credex-backup-service --tail 20

# Manual backup
docker exec credex-backup-service /scripts/integrated-backup.sh daily

# List backups
ls -la ./backups/
```

### Stop Production
```bash
# Stop all production services
docker compose -f docker-compose.prod.yml down
```

## 🔧 Troubleshooting
```bash
# Check resource usage
docker stats --no-stream

# Restart specific service
docker compose -f docker-compose.prod.yml restart credex-core-prod

# View specific service logs
docker logs credex-core-prod
```

## 📊 Monitoring URLs
- **Credex Core**: http://localhost:4000
- **Vimbiso Chat**: http://localhost:9000  
- **Neo4j Ledger**: http://localhost:7476
- **Neo4j Search**: http://localhost:7477
- **System Monitor**: http://localhost:9100
