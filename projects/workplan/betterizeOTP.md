# User-Initiated WhatsApp OTP Verification

## Current Implementation Analysis

### Current Flow
1. User initiates registration/password reset in VimbisoPay app
2. Credex Core generates OTP and stores it in database
3. Credex Core sends OTP via WhatsApp using Meta Business API with a template (already updated to not use template, but that still creates cost)
4. User receives OTP message in WhatsApp
5. User manually enters OTP in VimbisoPay app
6. App sends OTP to Credex Core for verification
7. Credex Core verifies OTP and completes the process

### Issues with Current Implementation
1. **Cost**: Business-initiated messages via WhatsApp Business API incur charges, especially at scale
2. **Template Restrictions**: Using templates requires approval and limits flexibility
3. **Delivery Reliability**: Template messages may face delivery issues or delays
4. **User Experience**: Manual OTP entry is prone to errors and creates friction

## Proposed Solution: User-Initiated Verification

### New Flow
1. User initiates registration/password reset in VimbisoPay app
2. VimbisoPay app generates OTP locally
3. App sends OTP to Credex Core for storage/verification
4. App displays a WhatsApp deep link with pre-populated message containing the OTP
5. User taps the link, which opens WhatsApp with the message ready to send
6. User sends the message to the Vimbiso chatbot
7. Chatbot receives message and forwards OTP to Credex Core for verification
8. Credex Core verifies OTP and notifies both the chatbot and app
9. User receives confirmation in both WhatsApp and the app

### Benefits
1. **Cost Reduction**: Eliminates business-initiated messages, as users initiate the WhatsApp conversation
2. **Improved Security**: Requires physical access to the user's WhatsApp account, proving both phone ownership and WhatsApp access
3. **Better User Experience**: No need to manually type OTP codes, reducing errors
4. **Increased Reliability**: Less dependent on WhatsApp Business API delivery success rates
5. **Simplified Implementation**: No need for template approval or management

## Technical Implementation Plan

### 1. Credex Core Changes

#### New Endpoints
- Create a new endpoint to store generated OTPs with associated memberIDs
- Modify verification endpoint to accept OTPs from the chatbot

```typescript
// New endpoint to store OTP
POST /api/Member/verify/storeOtp
Request:
{
  memberID: string,
  phone: string,
  otp: string,
  purpose: string
}

Response:
{
  success: boolean,
  message: string
}

// Modified endpoint to verify OTP (accepts source parameter)
POST /api/Member/verify/validateOtp
Request:
{
  memberID: string,
  otp: string,
  purpose: string,
  source: "app" | "chatbot" // New parameter to track verification source
}

Response:
{
  success: boolean,
  message: string,
  data: {
    memberID: string,
    otpVerified: boolean,
    resetToken?: string // For password reset flow
  }
}
```

#### Database Schema Updates
No additional schema changes needed beyond what's already in place for OTP verification.

#### Security Considerations
- Maintain existing rate limiting and security measures
- Add validation for the new `source` parameter
- Ensure proper logging of verification attempts from both sources

### 2. VimbisoPay App Changes

#### OTP Generation
- Implement secure OTP generation in the app
- Use a 6-digit numeric code for compatibility with existing systems

#### Deep Link Creation
- Create WhatsApp deep link with pre-populated message
- Format: `https://wa.me/[CHATBOT_NUMBER]?text=VERIFY%20[OTP]`
- Example: `https://wa.me/263785304448?text=VERIFY%20123456`

#### UI Changes
- Add button/QR code to open WhatsApp with pre-populated message
- Display clear instructions for the user
- Implement status tracking for verification process

### 3. Vimbiso Chatbot Changes

#### New Message Handler
- Add handler for "VERIFY" command in WhatsApp messages
- Extract OTP from incoming messages
- Forward to Credex Core for verification
- Respond to user with success/failure message

```python
# Example handler in vimbiso-chatserver
class VerifyOTPHandler:
    """Handle OTP verification messages"""
    
    async def handle_message(self, message_text, channel_id):
        """Process verification message"""
        # Extract OTP from message
        if message_text.startswith("VERIFY "):
            otp = message_text.split(" ")[1].strip()
            
            # Validate OTP format
            if not otp.isdigit() or len(otp) != 6:
                return WhatsAppMessage.create_text(
                    channel_id,
                    "❌ Invalid verification code format. Please send a 6-digit code."
                )
            
            # Forward to Credex Core for verification
            try:
                result = await self.verify_otp_with_credex(otp, channel_id)
                
                if result.get("success"):
                    return WhatsAppMessage.create_text(
                        channel_id,
                        "✅ Verification successful! You can now return to the app."
                    )
                else:
                    return WhatsAppMessage.create_text(
                        channel_id,
                        f"❌ Verification failed: {result.get('message', 'Unknown error')}"
                    )
            except Exception as e:
                logger.error(f"Error verifying OTP: {str(e)}")
                return WhatsAppMessage.create_text(
                    channel_id,
                    "❌ An error occurred during verification. Please try again."
                )
```

## Security Analysis

### Threat Model
1. **Intercepted OTP**: If an attacker intercepts the OTP, they would still need access to the user's WhatsApp account to complete verification
2. **Brute Force Attacks**: Existing rate limiting on Credex Core prevents brute force attempts
3. **Man-in-the-Middle**: HTTPS encryption protects API communications
4. **Replay Attacks**: One-time use OTPs with expiration prevent replay attacks

### Mitigations
1. **Multi-Channel Verification**: Verification happens across two separate channels (app + WhatsApp)
2. **Rate Limiting**: Maintain existing rate limiting for OTP requests and verification attempts
3. **Expiration**: OTPs expire after a short time period (e.g., 5 minutes)
4. **Logging**: Comprehensive logging of all verification attempts with source tracking

## Implementation Phases

### Phase 1: Core Infrastructure
1. Update Credex Core with new endpoints
2. Implement chatbot handler for verification messages
3. Create test harness for end-to-end testing

### Phase 2: Client Integration
1. Update VimbisoPay app to generate OTPs
2. Implement WhatsApp deep linking in app
3. Update UI flow for user-initiated verification
4. Add push notification when verification is complete

### Phase 3: Testing & Deployment
1. Comprehensive testing across all components
2. Gradual rollout to production
3. Monitoring and performance analysis

## Conclusion
The user-initiated WhatsApp OTP verification approach offers significant advantages in terms of cost, security, and user experience. By leveraging existing infrastructure (Vimbiso chatbot) and WhatsApp deep linking, we can create a seamless verification experience while eliminating the costs associated with business-initiated messages.


# User-Initiated WhatsApp OTP Verification Implementation Progress

## Completed

### Credex Core
- Added `/api/Member/verify/storeOtp` endpoint to store app-generated OTPs
- Added `/api/Member/verify/validateChatbotOtp` endpoint to validate OTPs from the chatbot
- Implemented proper validation, rate limiting, and security measures

### VimbisoPay App
- Added `storeOtp` method to the `AccountRepositoryImpl` class
  - This method sends OTPs to Credex Core for storage
  - Properly formats phone numbers and handles authentication

### Vimbiso Chatserver
- Created `VerifyOTPHandler` in the chatserver
  - Implemented handler for "VERIFY" commands in WhatsApp messages
  - Added validation for OTP format (6 digits)
  - Created connection to Credex Core for OTP verification
  - Added proper error handling and user-friendly responses
- Modified `WhatsAppFlowProcessor` to detect verification messages
  - Added logic to identify messages starting with "VERIFY"
  - Implemented routing to the `VerifyOTPHandler` for these messages
  - Preserved normal message flow for non-verification messages

## Next Steps

### VimbisoPay App UI
1. Implement OTP generation in the app:
   - Create a secure random number generator for 6-digit OTPs
   - Add this to the verification flow in the login and password reset screens

2. Create WhatsApp deep linking functionality:
   - Format: `https://wa.me/263785304448?text=VERIFY%20[OTP]`
   - Implement in the OTP verification screens

3. Update the UI to guide users:
   - Add instructions explaining the verification process
   - Create a button to open WhatsApp with the pre-populated message
   - Show verification status and success/failure messages

### Testing
1. End-to-end testing:
   - Verify OTP generation in the app
   - Confirm OTP storage in Credex Core
   - Test WhatsApp deep linking functionality
   - Verify OTP validation via the chatbot
   - Confirm the app receives verification status correctly

2. Edge case testing:
   - Test rate limiting behavior
   - Test expired OTPs
   - Test invalid OTP formats
   - Test network failures during verification

## Implementation Notes

The implementation follows a simple and efficient approach:

1. For the chatserver, we've modified the `WhatsAppFlowProcessor._extract_message_data` method to detect "VERIFY" messages and mark them with an `is_verification` flag. Then in the `process_message` method, we check for this flag and route these messages to the `VerifyOTPHandler` instead of the normal flow processing.

2. For the VimbisoPay app, we need to:
   - Generate a random 6-digit OTP
   - Store it via the existing `storeOtp` method
   - Create a WhatsApp deep link with the format `https://wa.me/263785304448?text=VERIFY%20[OTP]`
   - Open this link when the user taps a button

This approach requires minimal changes to the existing architecture while providing a seamless user experience and reducing costs associated with business-initiated WhatsApp messages.
