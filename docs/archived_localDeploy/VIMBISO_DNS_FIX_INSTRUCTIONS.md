# Vimbiso DNS Fix Instructions

## Current Situation
- ✅ Both domains (mycredex.app and vimbisopay.africa) are active in Cloudflare dashboard
- ✅ Both tunnels are running and healthy
- ✅ vimbiso-chatserver-prod is running on port 9000
- ❌ DNS record is incorrectly created as `vimbisopay.africa.mycredex.app`

## Manual Fix Required in Cloudflare Dashboard

### Step 1: Access vimbisopay.africa Zone
1. Go to Cloudflare Dashboard
2. Click on **vimbisopay.africa** domain
3. Go to **DNS** > **Records**

### Step 2: Delete Incorrect Records (if any)
Look for and delete any records like:
- `vimbisopay.africa.mycredex.app`
- Any CNAME records pointing to the wrong tunnel

### Step 3: Create Correct DNS Records
Create these CNAME records in the **vimbisopay.africa** zone:

| Type  | Name | Target | TTL |
|-------|------|--------|-----|
| CNAME | @ | 8ef6eec4-04dd-4d58-bd90-f8c3d180df6b.cfargotunnel.com | Auto |
| CNAME | www | 8ef6eec4-04dd-4d58-bd90-f8c3d180df6b.cfargotunnel.com | Auto |
| CNAME | api | 8ef6eec4-04dd-4d58-bd90-f8c3d180df6b.cfargotunnel.com | Auto |

### Step 4: Verify Configuration
After creating the records:
1. Wait 2-3 minutes for propagation
2. Test: https://vimbisopay.africa
3. Test: https://www.vimbisopay.africa
4. Test: https://api.vimbisopay.africa

## Alternative: Command Line Fix
If you prefer command line, try this from a different directory or with explicit zone specification:

```bash
# Try from a different location
cd C:\
C:\Great-Sun-Group\credex-core\cloudflared.exe tunnel route dns 8ef6eec4-04dd-4d58-bd90-f8c3d180df6b vimbisopay.africa --overwrite-dns
```

## Tunnel Information
- **Vimbiso Tunnel ID**: 8ef6eec4-04dd-4d58-bd90-f8c3d180df6b
- **Tunnel Name**: vimbiso-tunnel
- **Target Service**: http://localhost:9000
- **Tunnel Status**: Running with 4 connections (2xyhz02, 2xyyz04)

## Expected Result
Once fixed, vimbisopay.africa should:
- Resolve to the Cloudflare tunnel
- Route traffic to localhost:9000 (vimbiso-chatserver-prod)
- Show the Vimbiso ChatServer application
- Work for all subdomains (www, api)

## Verification Commands
After fixing, verify with:
```bash
# Check tunnel status
.\cloudflared.exe tunnel list

# Test DNS resolution
nslookup vimbisopay.africa
nslookup www.vimbisopay.africa
