# Vimbiso.co.zw Domain Setup Instructions

## Overview
Setting up `vimbisopay.co.zw` to use the existing Vimbiso tunnel for Gmail MX records and web traffic.

## Current Configuration
- **Tunnel ID**: `8ef6eec4-04dd-4d58-bd90-f8c3d180df6b` (same as vimbisopay.africa)
- **Tunnel Target**: `8ef6eec4-04dd-4d58-bd90-f8c3d180df6b.cfargotunnel.com`
- **Service**: http://localhost:9000 (vimbiso-chatserver-prod)
- **Configuration Updated**: ✅ cloudflared-config-vimbiso.yml now includes vimbisopay.co.zw

## Step 1: Add Domain to Cloudflare
1. Go to Cloudflare Dashboard
2. Click **"Add a Site"**
3. Enter: `vimbisopay.co.zw`
4. Choose your plan (Free is fine)
5. Complete the domain verification process

## Step 2: Update Nameservers
Cloudflare will provide nameservers like:
- `name1.cloudflare.com`
- `name2.cloudflare.com`

Update these at your domain registrar for `vimbisopay.co.zw`.

## Step 3: Create DNS Records in Cloudflare
In the `vimbisopay.co.zw` zone, create these CNAME records:

| Type  | Name | Target | TTL | Proxy Status |
|-------|------|--------|-----|--------------|
| CNAME | @ | 8ef6eec4-04dd-4d58-bd90-f8c3d180df6b.cfargotunnel.com | Auto | Proxied |
| CNAME | www | 8ef6eec4-04dd-4d58-bd90-f8c3d180df6b.cfargotunnel.com | Auto | Proxied |
| CNAME | api | 8ef6eec4-04dd-4d58-bd90-f8c3d180df6b.cfargotunnel.com | Auto | Proxied |

## Step 4: Add Gmail MX Records
For Gmail workspace, add these MX records:

| Type | Name | Target | Priority | TTL |
|------|------|--------|----------|-----|
| MX | @ | aspmx.l.google.com | 1 | Auto |
| MX | @ | alt1.aspmx.l.google.com | 5 | Auto |
| MX | @ | alt2.aspmx.l.google.com | 5 | Auto |
| MX | @ | alt3.aspmx.l.google.com | 10 | Auto |
| MX | @ | alt4.aspmx.l.google.com | 10 | Auto |

## Step 5: Restart Tunnel (if needed)
If the tunnel is currently running, restart it to pick up the new configuration:

```bash
# Stop current tunnel (if running)
# Then restart with:
.\cloudflared.exe tunnel --config cloudflared-config-vimbiso.yml run
```

## Step 6: Verify Setup
After DNS propagation (5-10 minutes):

### Web Traffic Test:
- https://vimbisopay.co.zw
- https://www.vimbisopay.co.zw
- https://api.vimbisopay.co.zw

### DNS Resolution Test:
```bash
nslookup vimbisopay.co.zw
nslookup www.vimbisopay.co.zw
nslookup -type=MX vimbisopay.co.zw
```

## Key Points
- ✅ **Same tunnel ID**: Using existing `8ef6eec4-04dd-4d58-bd90-f8c3d180df6b`
- ✅ **No new tunnel needed**: One tunnel can handle multiple domains
- ✅ **Configuration updated**: New domain added to cloudflared-config-vimbiso.yml
- ✅ **Gmail ready**: MX records will work independently of web traffic routing

## Troubleshooting
If vimbisopay.co.zw doesn't work:
1. Check DNS propagation: https://dnschecker.org
2. Verify tunnel is running: `.\cloudflared.exe tunnel list`
3. Check tunnel logs: `C:\Great-Sun-Group\credex-core\logs\cloudflared-vimbiso.log`
4. Ensure domain is added to Cloudflare and nameservers are updated

## Expected Result
- `vimbisopay.co.zw` will route to the same Vimbiso ChatServer as `vimbisopay.africa`
- Gmail MX records will work for email
- Both domains will share the same tunnel infrastructure
