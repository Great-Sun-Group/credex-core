# WhatsApp Backend Configuration: Dev vs. Prod Analysis

Based on our testing results, here are the most likely backend configuration differences that could explain why dev delivers OTP messages while prod doesn't:

## 1. Template Approval Status

The different error messages when accessing templates suggest different configurations:
- Dev: `(#200) You do not have permission to access this field`
- Prod: `(#100) Tried accessing nonexisting field (message_templates) on node type (Business)`

The prod error suggests the template might not be fully registered at the business level. Even though you copied the template, it might need specific approval in the prod environment.

## 2. Button URL Configuration

Since the template requires a URL button with the OTP code as parameter:
- Check if the URL domain in prod is properly verified and allowlisted
- Verify the button URL in prod points to a valid endpoint
- Ensure the button configuration matches exactly between environments

## 3. Message Template Category

The template category affects delivery permissions:
- Verify the template is categorized as "Authentication" or "OTP" in prod
- Check if the prod template has the same category as dev

## 4. Business Verification Level

Despite being under the same FB business, the specific WhatsApp Business accounts might have different verification levels:
- Check if the prod WhatsApp Business account has completed all verification steps
- Verify business verification status in prod matches dev

## 5. Phone Number Verification

Both show "EXPIRED" verification codes, but:
- The dev number might have been previously fully verified before expiring
- The prod number might have never completed full verification
- Re-verification might be required specifically for the prod number

## Next Steps

1. In Meta Business Manager, compare these specific settings between dev and prod:
   - Template approval status for "vimbiso_otp"
   - Button URL configuration and domain verification
   - Template category and quality rating
   - Business verification level
   - Phone number verification history

2. Focus on the template configuration first, as the error messages suggest this is the most likely difference.
