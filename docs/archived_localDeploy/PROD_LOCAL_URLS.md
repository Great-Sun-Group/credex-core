# 🔗 Production Environment - Key Local URLs

Quick reference for accessing your production services running locally.

## 🚀 **Core Application Services**

### **Credex Core API (Production)**
- **Main API**: http://localhost:4000
- **API Documentation (Swagger)**: http://localhost:4000/api-docs
- **Status**: Production mode with full authentication

### **Vimbiso ChatServer (Production)**
- **Main Service**: http://localhost:9000
- **Health Check**: http://localhost:9000/health/
- **Status**: Production WhatsApp integration enabled

## 💾 **Database Services**

### **Neo4j Ledger Database (Production)**
- **Browser Interface**: http://localhost:7476
- **Bolt Connection**: bolt://localhost:7689
- **Credentials**: neo4j / password

### **Neo4j Search Database (Production)**
- **Browser Interface**: http://localhost:7477
- **Bolt Connection**: bolt://localhost:7690
- **Credentials**: neo4j / password

### **Redis State Manager (Production)**
- **Connection**: localhost:6380
- **Status**: Persistent storage enabled

## 📊 **Monitoring & Management**

### **System Monitor**
- **Metrics Dashboard**: http://localhost:9100
- **Type**: Prometheus Node Exporter
- **Data**: CPU, Memory, Disk, Network metrics

### **Backup Service**
- **Status**: Check with `docker logs credex-backup-service`
- **Schedule**: 
  - Hourly: Every 2 hours
  - Daily: 1 AM UTC
  - Weekly: Sunday 2 AM UTC
  - Maintenance: Midnight UTC

## 🔄 **Port Mapping Summary**

| Service | Development | Production |
|---------|-------------|------------|
| Credex Core API | 3000 | **4000** |
| Vimbiso ChatServer | 8000 | **9000** |
| Neo4j Ledger HTTP | 7474 | **7476** |
| Neo4j Ledger Bolt | 7687 | **7689** |
| Neo4j Search HTTP | 7475 | **7477** |
| Neo4j Search Bolt | 7688 | **7690** |
| Redis | 6379 | **6380** |
| System Monitor | - | **9100** |

## 🛠️ **Quick Commands**

### **Check All Services Status**
```bash
docker compose -f docker-compose.prod.yml ps
```

### **View Service Logs**
```bash
# Credex Core logs
docker logs credex-core-prod --tail 50

# ChatServer logs
docker logs vimbiso-chatserver-prod --tail 50

# Backup service logs
docker logs credex-backup-service --tail 20
```

### **Health Checks**
```bash
# Test Credex Core API
curl http://localhost:4000/api-docs

# Test ChatServer
curl http://localhost:9000/health/

# Test System Monitor
curl http://localhost:9100/metrics
```

### **Stop/Start Production Environment**
```bash
# Stop all production services
docker compose -f docker-compose.prod.yml --env-file .env.prod down

# Start all production services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

## 📝 **Notes**

- **Environment Isolation**: Production runs completely separate from development
- **Data Persistence**: All production data is stored in Docker volumes
- **Backup Protection**: Automated backups protect against data loss
- **Resource Sharing**: Services are configured for shared server deployment
- **Health Monitoring**: All services have health checks and monitoring

---

**Last Updated**: July 13, 2025  
**Environment**: Production (Local Deployment)  
**Status**: ✅ All Services Operational
