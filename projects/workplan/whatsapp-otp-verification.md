# Multi-Provider OTP Verification Implementation

## Overview
Implement a provider-agnostic OTP verification system where v2 password users must verify their WhatsApp during registration, while maintaining backward compatibility for v1 (phone_only) users. Initially supporting WhatsApp with the ability to easily add SMS and email providers in the future.

## Authentication Flow

### V1 Users (phone_only auth)
- Continue with existing authentication flow
- No OTP verification required
- Maintains backward compatibility

### V2 Users (Password-based auth)
- Mandatory WhatsApp verification during registration
- Registration flow:
  1. User provides registration details (phone, password, etc.)
  2. System sends OTP via WhatsApp
  3. User must verify OTP to complete registration
- Login flow:
  - Standard password-based authentication
  - No OTP required for login

## Technical Design

### 1. Database Schema Updates

```typescript
interface Member {
  // Existing fields
  memberID: string;
  firstname: string;
  lastname: string;
  phone: string;
  // ... other existing fields ...

  // New verification fields
  whatsappVerified: boolean;
  lastOtpTimestamp: string; // ISO date
  verificationMethod: VerificationProviderType;
  verificationAttempts: number;
  lastVerificationAttempt: string;
  otpRequestsToday: number;
  lastOtpRequest: string;
}
```

### 2. Provider Architecture

#### Provider Interface
```typescript
interface IVerificationProvider {
  sendOTP(to: string, otp: string): Promise<Result>;
  validateDelivery(deliveryId: string): Promise<boolean>;
  getProviderType(): VerificationProviderType;
}

enum VerificationProviderType {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  EMAIL = 'email'
}
```

#### Provider Implementations
```typescript
class WhatsAppProvider implements IVerificationProvider {
  private readonly apiKey: string;
  
  constructor() {
    this.apiKey = process.env.WHATSAPP_API_KEY;
  }
  
  async sendOTP(to: string, otp: string): Promise<Result> {
    // WhatsApp-specific implementation
  }
}

// Future providers (SMS, Email) will follow the same interface
```

#### Provider Factory
```typescript
class VerificationProviderFactory {
  static createProvider(type: VerificationProviderType): IVerificationProvider {
    switch (type) {
      case VerificationProviderType.WHATSAPP:
        return new WhatsAppProvider();
      // Future provider cases
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  }
}
```

#### Verification Service
```typescript
class VerificationService {
  private provider: IVerificationProvider;
  private readonly otpManager: OTPManager;
  
  constructor(providerType: VerificationProviderType) {
    this.provider = VerificationProviderFactory.createProvider(providerType);
    this.otpManager = new OTPManager();
  }
  
  async sendOTP(to: string): Promise<Result> {
    const otp = this.otpManager.generateOTP();
    const hashedOTP = await this.otpManager.hashOTP(otp);
    return this.provider.sendOTP(to, otp);
  }

  async verifyUserType(memberID: string): Promise<{
    version: 'v1' | 'v2',
    authMethod: 'phone_only' | 'password'
  }> {
    // Check user version and auth method
    // Returns user authentication configuration
  }
}
```

### 3. Environment Configuration

```bash
# Provider Selection
VERIFICATION_PROVIDER=whatsapp

# Provider API Keys
WHATSAPP_API_KEY=''

# Verification Settings
OTP_EXPIRY='5m'
MAX_DAILY_OTP_REQUESTS=5
OTP_COOLDOWN_MINUTES=5
```

### 4. Security Implementation

#### OTP Management
```typescript
class OTPManager {
  private readonly rounds = 10;
  
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  async hashOTP(otp: string): Promise<string> {
    return bcrypt.hash(otp, this.rounds);
  }

  async verifyOTP(plainOTP: string, hashedOTP: string): Promise<boolean> {
    return bcrypt.compare(plainOTP, hashedOTP);
  }
}
```

#### Security Controls
- Rate Limiting:
  - 5 OTP requests per day per member during registration
  - 3 verification attempts per OTP
  - 5-minute cooldown between requests
- OTP Security:
  - 6-digit numeric codes
  - 5-minute expiration
  - Bcrypt hashing
  - One-time use

### 5. API Endpoints

#### Initial WhatsApp Verification (Required for v2 registration)
```typescript
POST /api/Member/verify/whatsapp
Request:
{
  memberID: string,
  phone: string
}

Response:
{
  success: boolean,
  message: string
}
```

#### Request OTP (For v2 registration)
```typescript
POST /api/Member/verify/request-otp
Request:
{
  memberID: string,
  phone: string
}

Response:
{
  success: boolean,
  message: string,
  cooldownMinutes?: number
}
```

#### Validate OTP
```typescript
POST /api/Member/verify/validate-otp
Request:
{
  memberID: string,
  otp: string
}

Response:
{
  success: boolean,
  message: string,
  remainingAttempts?: number
}
```

### 6. Error Handling

```typescript
enum VerificationError {
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_OTP = 'INVALID_OTP',
  OTP_EXPIRED = 'OTP_EXPIRED',
  MAX_ATTEMPTS_EXCEEDED = 'MAX_ATTEMPTS_EXCEEDED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  WHATSAPP_NOT_VERIFIED = 'WHATSAPP_NOT_VERIFIED',
  V1_USER_NOT_SUPPORTED = 'V1_USER_NOT_SUPPORTED'
}

interface VerificationErrorResponse {
  error: VerificationError;
  message: string;
  cooldownRemaining?: number;
  remainingAttempts?: number;
}
```

### 7. Security Logging

```typescript
interface SecurityEvent {
  eventType: 'OTP_REQUEST' | 'OTP_VALIDATION' | 'WHATSAPP_VERIFICATION';
  memberID: string;
  version: 'v1' | 'v2';
  authMethod: 'phone_only' | 'password';
  timestamp: Date;
  metadata: Record<string, unknown>;
  severity: 'INFO' | 'WARN' | 'ERROR';
}

class SecurityLogger {
  async logSecurityEvent(event: SecurityEvent): Promise<void>
  async alertOnSuspiciousActivity(event: SecurityEvent): Promise<void>
}
```

## Testing Strategy

### Unit Tests
- Provider interface implementations
- OTP generation and validation
- Version/auth method detection
- Rate limiting logic
- Expiration handling
- Error scenarios

### Integration Tests
- WhatsApp API integration
- Database operations
- End-to-end verification flows:
  - V1 user login (no OTP)
  - V2 user registration with WhatsApp verification
  - V2 user login (password only)
- Error handling

### Security Tests
- Rate limiting effectiveness
- OTP brute force prevention
- Input validation
- Version bypass attempts
- Error handling

## Implementation Phases

1. Core Architecture
   - Provider interface
   - Factory implementation
   - Version detection service

2. WhatsApp Integration
   - WhatsApp provider implementation
   - Number verification
   - OTP delivery

3. Database Updates
   - Member schema changes
   - Neo4j indices for new fields

4. API Implementation
   - Version-aware endpoints
   - Security middleware
   - Authentication flow updates

5. Testing
   - Version-specific test cases
   - Security validation

6. Documentation
   - API documentation
   - Security considerations

## Security Considerations

1. OWASP Compliance
   - Input validation
   - Rate limiting
   - Secure communications
   - Audit logging
   - Error handling

2. Version Security
   - Prevent version spoofing
   - Secure version detection
   - Bypass prevention

3. Data Protection
   - OTP hashing
   - Secure storage
   - WhatsApp verification status

4. Anti-Automation
   - Rate limiting
   - Cooldown periods
   - Version-specific limits

5. Monitoring
   - Version-specific logging
   - Security event tracking
   - Performance monitoring

## Configuration for Testing

```typescript
// Test environment variables
VERIFICATION_PROVIDER=whatsapp
OTP_EXPIRY='1m'
MAX_DAILY_OTP_REQUESTS=100
OTP_COOLDOWN_MINUTES=1
```

This configuration allows for rapid testing while maintaining security in production. The shorter timeouts and increased limits facilitate testing without compromising the security model.
