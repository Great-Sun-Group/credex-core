# WhatsApp OTP Verification Debugging Report

## Issue Summary
The WhatsApp OTP verification system is working in the development environment but not in the production environment. Testing confirms that while both environments accept messages with the correct format, only the development environment actually delivers the OTP messages.

## Environment Configuration

### Development Environment
- WhatsApp Business ID: 344632735405603
- WhatsApp Phone ID: 390447444143042
- Phone Number: +263 78 727 4250
- API Version: v17.0 (in code) / v22.0 (in FB backend)
- Verification Status: "code_verification_status":"EXPIRED"
- Quality Rating: "GREEN"
- Connection Status: "CONNECTED"

### Production Environment
- WhatsApp Business ID: 292847151340407
- WhatsApp Phone ID: 340016822530864
- Phone Number: +263 78 530 4448
- API Version: v17.0 (in code) / v22.0 (in FB backend)
- Verification Status: "code_verification_status":"EXPIRED"
- Quality Rating: "GREEN"
- Connection Status: "CONNECTED"

## Testing Results

### API Connectivity Tests
Both environments successfully connect to the WhatsApp API and return phone number information:

**Dev:**
```json
{"verified_name":"Credex Demo","quality_rating":"GREEN","status":"CONNECTED","id":"390447444143042"}
```

**Prod:**
```json
{"verified_name":"Credex","quality_rating":"GREEN","status":"CONNECTED","id":"340016822530864"}
```

### Message Template Tests
Both environments return errors when trying to access template information:

**Dev:**
```json
{"error":{"message":"(#200) You do not have permission to access this field.","type":"OAuthException","code":200}}
```

**Prod:**
```json
{"error":{"message":"(#100) Tried accessing nonexisting field (message_templates) on node type (Business)","type":"OAuthException","code":100}}
```

### Message Sending Tests
Both environments accept messages with the correct format, but only dev actually delivers them:

**Dev:**
```json
{"messaging_product":"whatsapp","contacts":[{"input":"263778177125","wa_id":"263778177125"}],"messages":[{"id":"wamid.HBgMMjYzNzc4MTc3MTI1FQIAERgSNkExQkY0REYyMDExMkFBNTZEAA==","message_status":"accepted"}]}
```

**Prod:**
```json
{"messaging_product":"whatsapp","contacts":[{"input":"263778177125","wa_id":"263778177125"}],"messages":[{"id":"wamid.HBgMMjYzNzc4MTc3MTI1FQIAERgSNERBMDBCRkIyODlFN0U3Q0Q4AA==","message_status":"accepted"}]}
```

### Code Verification Status
Both environments have expired verification codes, but this only prevents message delivery in production:

**Dev:**
```json
{"display_phone_number":"+263 78 727 4250","code_verification_status":"EXPIRED","id":"390447444143042"}
```

**Prod:**
```json
{"display_phone_number":"+263 78 530 4448","code_verification_status":"EXPIRED","id":"340016822530864"}
```

### Successful Message Format
The key to successful message delivery is using the correct format for the template, particularly for the button parameter:

```json
{
  "messaging_product": "whatsapp", 
  "to": "263778177125", 
  "type": "template", 
  "template": {
    "name": "vimbiso_otp", 
    "language": {"code": "en"}, 
    "components": [
      {
        "type": "body", 
        "parameters": [
          {
            "type": "text", 
            "text": "123456"
          }
        ]
      }, 
      {
        "type": "button", 
        "sub_type": "url", 
        "index": 0, 
        "parameters": [
          {
            "type": "text", 
            "text": "123456"
          }
        ]
      }
    ]
  }
}
```

The critical insight is that the button parameter must use the same value as the OTP code.

## Key Findings

1. **API Version Compatibility**: Both environments accept messages with API v22.0, which matches the Facebook backend configuration.

2. **Expired Verification Codes**: Both environments have expired verification codes (`"code_verification_status":"EXPIRED"`), which may be preventing message delivery in production but not in development.

3. **Different Error Types**: When accessing templates, dev returns a permission error (#200) while prod returns a "nonexisting field" error (#100), suggesting different configurations or permissions.

4. **Message Format Critical**: The correct message format, particularly using the same value for both the OTP code and the button parameter, is necessary but not sufficient for successful message delivery.

5. **Template Configuration**: The `vimbiso_otp` template appears to be properly configured in dev, but may have issues in prod despite being accepted by the API.

6. **OTP Delivery Confirmation**: Testing with curl confirmed that OTP messages are successfully delivered in the dev environment despite the "EXPIRED" verification status, but not in production.

7. **Message Acceptance vs. Delivery**: Both environments return `"message_status":"accepted"`, but only dev actually delivers the messages, indicating an issue beyond the API acceptance.

## Partially Resolved Issues

1. **Message Format**: We've identified the correct message format, particularly the button parameter configuration. Using the same value for both the OTP code and the button parameter is necessary for message acceptance.

2. **API Version**: Using API v22.0 in both environments ensures compatibility with the Facebook backend configuration.

## Remaining Issues

1. **Production Delivery Failure**: Despite accepting messages with the correct format, the production environment is not delivering OTP messages.

2. **Template Approval**: The `vimbiso_otp` template may not be fully approved or properly configured in the production environment.

3. **Phone Number Verification**: The expired verification code in production may be preventing message delivery, unlike in development.

4. **Business Account Configuration**: The production business account may have different settings or restrictions compared to development.

## Next Steps

1. **Review Key Backend Differences**: Review the focused analysis of potential backend configuration differences between dev and prod in [OTPdebug-backend-config.md](./OTPdebug-backend-config.md), which highlights the most likely issues based on our testing results.

2. **Check Template Status in Production**: The different error messages when accessing templates suggest configuration differences:
   - Verify the `vimbiso_otp` template is fully approved in production
   - Check if the template is properly registered at the business level
   - Ensure the button URL configuration matches exactly between environments

3. **Re-verify Production Phone Number**: Re-verify the production phone number in the Meta Business Manager:
   - Log in to the Meta Business Manager
   - Navigate to the WhatsApp Business Account
   - Select the phone number +263 78 530 4448
   - Follow the verification process

4. **Compare Business Verification Levels**: Despite being under the same FB business, the specific WhatsApp Business accounts might have different verification levels:
   - Check if the prod WhatsApp Business account has completed all verification steps
   - Verify business verification status in prod matches dev

4. **Update API Version in Code**: Update the hardcoded API version in the WhatsAppProvider from v17.0 to v22.0:
   ```typescript
   // Change this line in WhatsAppProvider.ts
   this.apiBaseUrl = `https://graph.facebook.com/v22.0/${this.phoneId}`;
   ```

5. **Ensure Correct Message Format**: Update the WhatsAppProvider to use the correct message format:
   ```typescript
   // Ensure the button parameter uses the same value as the OTP code
   const messageData = {
     messaging_product: "whatsapp",
     to: phoneNumber,
     type: "template",
     template: {
       name: "vimbiso_otp",
       language: { code: "en" },
       components: [
         {
           type: "body",
           parameters: [
             {
               type: "text",
               text: otpCode
             }
           ]
         },
         {
           type: "button",
           sub_type: "url",
           index: 0,
           parameters: [
             {
               type: "text",
               text: otpCode // Use the same OTP code for the button parameter
             }
           ]
         }
       ]
     }
   };
   ```

6. **Contact Meta Support**: If the issue persists, contact Meta Business Support for assistance with the production environment.

7. **Enhance Error Logging**: Add more detailed logging in the WhatsAppProvider to capture specific error messages and response codes.

8. **Test with Different Phone Numbers**: Try sending messages to different phone numbers to see if the issue is specific to certain recipients.

## Implementation Plan

1. **Immediate Action**: Check the template configuration in production, focusing on approval status and button URL configuration, as this is the most likely issue based on the error messages.

2. **Template Verification**: Verify that the `vimbiso_otp` template is properly registered at the business level in production.

3. **Phone Number Verification**: Re-verify the production phone number to address the expired verification code.

3. **Code Update**: Modify the WhatsAppProvider to use v22.0 instead of v17.0 and ensure the correct message format:
   ```typescript
   // Change this line in WhatsAppProvider.ts
   this.apiBaseUrl = `https://graph.facebook.com/v22.0/${this.phoneId}`;
   
   // Ensure the button parameter uses the same value as the OTP code
   // in the sendOTP method or equivalent
   ```

4. **Enhanced Monitoring**: Add more detailed logging to track message delivery status and capture specific error messages.

5. **Testing Strategy**: Implement a systematic testing approach to verify message delivery across different phone numbers and scenarios.

6. **Documentation**: Update documentation to reflect the findings:
   - The correct message format is critical, particularly for the button parameter
   - Expired verification codes may affect message delivery differently between environments
   - Both environments should use API v22.0
