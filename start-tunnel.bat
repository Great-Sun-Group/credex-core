@echo off
cd /d "C:\Great-Sun-Group\credex-core"
echo Starting Cloudflare Tunnel...
cloudflared.exe tunnel --config cloudflared-config.yml run
pause
