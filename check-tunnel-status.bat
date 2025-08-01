@echo off
echo Checking Cloudflare Tunnel Status...
echo.

echo === Tunnel Process Status ===
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I "cloudflared.exe" >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Cloudflared process is RUNNING
    tasklist /FI "IMAGENAME eq cloudflared.exe"
) else (
    echo ❌ Cloudflared process is NOT RUNNING
)

echo.
echo === Testing Domain Connectivity ===
echo Testing https://mycredex.app...
curl -s -o nul -w "Status: %%{http_code} - Response Time: %%{time_total}s\n" https://mycredex.app/api-docs

echo.
echo === Tunnel List ===
cd /d "C:\Great-Sun-Group\credex-core"
cloudflared.exe tunnel list

echo.
echo === Quick Actions ===
echo To start tunnel: start-tunnel.bat
echo To stop tunnel: taskkill /F /IM cloudflared.exe
echo.
pause
