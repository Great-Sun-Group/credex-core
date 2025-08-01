# Development Verification Setup

## Overview
For local development, you can bypass WhatsApp verification by using a fixed OTP of `123456` instead of requiring actual WhatsApp messages.

## Quick Setup

1. **Mock Verification Enabled**: Already configured in `docker-compose.dev-local.yml`:
   ```yaml
   USE_MOCK_VERIFICATION: "true"
   ```

2. **Use Fixed OTP**: When in development mode, always use `123456` as the OTP code.

## What Was Implemented

### Backend (credex-core)
✅ **Enhanced Provider Factory**: Modified `VerificationProviderFactory` to automatically use mock provider when `USE_MOCK_VERIFICATION=true` and `NODE_ENV=development`

✅ **Enhanced Mock Provider**: Updated `MockWhatsAppProvider` to always return `123456` as the OTP in development mode

✅ **Environment Configuration**: Added `USE_MOCK_VERIFICATION` environment variable to docker-compose and .env.example

### Mobile App (vimbisopay_app)
✅ **Development Mode Detection**: App detects development mode via `ApiConfig.isDevelopment` (when connecting to `http://10.0.2.2:3000`)

✅ **Visual Development Indicator**: Shows orange "Development Mode: Use OTP 123456" banner when in dev mode

✅ **Modified Instructions**: Changes verification steps to show development-specific instructions

✅ **Fixed OTP Display**: Shows `123456` in orange instead of the generated OTP when in development mode

## How It Works

### Development Flow
1. Mobile app detects it's connecting to local development server
2. Shows development mode indicator with fixed OTP `123456`
3. Backend uses `MockWhatsAppProvider` which internally uses `123456`
4. User manually enters `123456` in any OTP verification field
5. Verification succeeds without requiring WhatsApp

### Production Flow
- Uses real `WhatsAppProvider` 
- Sends actual OTP via WhatsApp
- No development indicators shown
- Normal WhatsApp verification process

## Log Messages
When mock verification is active, you'll see:
```
[INFO] Using development mock provider with fixed OTP
[INFO] Mock provider using fixed development OTP { actualOTP: '123456' }
```

## Production Safety
- Mock verification only works when `NODE_ENV=development` AND `USE_MOCK_VERIFICATION=true`
- Production environments ignore the `USE_MOCK_VERIFICATION` setting
- Real WhatsApp verification is always used in staging/production
