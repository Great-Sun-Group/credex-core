# Budget "Hacker" Setup for Express.js Server

If you're looking to run this Express.js application on a budget with used hardware and a residential internet connection, here's how you could make it work for minimal traffic:

## Used Hardware Options

### Single Machine Setup (Most Economical)
- **Used Enterprise Desktop/Workstation**:
  - **CPU**: Intel i7 (4th gen or newer) or Ryzen 5/7 (1st gen or newer)
  - **RAM**: 16GB (minimum)
  - **Storage**: 256GB SSD + 1TB HDD
  - **Cost Estimate**: $200-400 on eBay, local classifieds, or computer recyclers

### Alternative: Used Server
- **Used Enterprise Server** (e.g., Dell PowerEdge R720, HP ProLiant DL380 G8/G9):
  - **CPU**: Dual Xeon E5-2670 or similar
  - **RAM**: 32GB DDR3 ECC
  - **Storage**: Add your own SSDs (256GB for OS, 512GB for data)
  - **Cost Estimate**: $300-500 without drives
  - **Note**: Higher power consumption, louder fans

### Budget Considerations
- **Power Consumption**: Desktop will be more power-efficient than a rack server
- **Noise**: Enterprise servers can be loud; desktops are quieter
- **Cooling**: Ensure adequate ventilation, especially for servers

## Residential Internet Setup

### Connection Requirements
- **Speed**: 50Mbps download / 10Mbps upload (minimum)
- **Type**: Cable or Fiber preferred over DSL
- **Static IP**: Two options:
  1. **Budget Option**: Use a dynamic DNS service (free options: No-IP, DuckDNS)
  2. **Better Option**: Pay for a static IP from your ISP ($5-15/month extra)

### Network Setup
- **Router**: Any decent consumer router with port forwarding capability
- **Security**: 
  - Configure firewall rules on your router
  - Only open necessary ports (typically 80/443)
  - Consider a reverse proxy like Nginx for added security

## Software Configuration

### Operating System
- **Linux**: Ubuntu Server 20.04/22.04 LTS (free)
- **Alternative**: Debian or Proxmox VE if you want to run multiple VMs

### Virtualization (Optional but Recommended)
- **Docker**: Run your application in containers as designed
- **Alternative**: Use Proxmox VE to create separate VMs for application and database

### Database Optimization
- **Neo4j Configuration**: 
  - Reduce heap size to fit your available RAM
  - Adjust cache settings for smaller memory footprint
  - Consider running both database instances on the same Neo4j server

## Traffic Management

### Rate Limiting
- Your current rate limiter (30 requests per minute per user) is already conservative
- For minimal traffic, this should be fine

### Bandwidth Considerations
- 200 users with minimal activity should be well within residential bandwidth limits
- Monitor your bandwidth usage to avoid ISP throttling

## Reliability Considerations

### Power Protection
- **Budget UPS**: APC BE600M1 (~$70) for graceful shutdown during power outages

### Backup Strategy
- **External Hard Drive**: Weekly manual backups
- **Cloud Backup**: Use a free tier of cloud storage for critical data

### Uptime Management
- **Monitoring**: Set up free monitoring with Uptime Robot
- **Auto-restart**: Configure systemd services to auto-restart on failure

## Domain and SSL

- **Domain**: ~$10/year (Namecheap, Porkbun, etc.)
- **SSL Certificate**: Free with Let's Encrypt
- **Alternative**: Use Cloudflare as a free CDN/proxy for added security and performance

## Potential Limitations

1. **Residential ISP Restrictions**: Some ISPs prohibit hosting servers on residential connections
2. **Bandwidth Caps**: Check if your ISP has monthly data caps
3. **Uptime**: Residential connections typically have no SLA and may experience occasional outages
4. **Scalability**: Limited ability to scale if traffic increases significantly

This setup should handle a couple hundred users with minimal traffic patterns. If usage grows, you can gradually upgrade components or consider moving to a more robust hosting solution.
