# Endpoint Tests Status and Patterns

## Successfully Tested Endpoints

1. Keyhole Endpoints (no JWT required):
   - `/login`
     - Uses x-client-api-key header
     - Example: `npm test login 263778177125`
   - `/onboardMember`
     - Uses x-client-api-key header
     - Example: `npm test onboardmember Ryan Watson 263778177125 USD`

2. JWT-Protected Endpoints:
   - `/getBalances`
     - Example: `npm test getbalances 263778177125 ad402dc1-46b6-44a7-8bcb-f7487a72dca0`
     - First arg: phone for login
     - Second arg: accountID for test
   - `/getLedger`
     - Example: `npm test getledger 263778177125 ad402dc1-46b6-44a7-8bcb-f7487a72dca0`
     - First arg: phone for login
     - Second arg: accountID for test
   - `/getMemberDashboardByPhone`
     - Example: `npm test getmemberdashboardbyphone 263778177125`
     - First arg: phone for both login and test

## Update Patterns

1. Endpoint Path Pattern:
   - Remove module name prefixes (e.g., use `/getBalances` not `/account/getBalances`)
   - Exception: Admin endpoints still use their prefix

2. Parameter Pattern:
   - First argument is always phone number for login (except keyhole endpoints)
   - Subsequent arguments are passed to the actual test
   - MemberID is now extracted from JWT by server - remove from test parameters

3. Test File Updates:
   ```typescript
   // For keyhole endpoints (login, onboardMember)
   const response = await axios.post("/endpoint", data, {
     headers: {
       'x-client-api-key': process.env.CLIENT_API_KEY
     }
   });

   // For JWT-protected endpoints
   const response = await authRequest("/endpoint", {
     // parameters without memberID
   }, jwt);
   ```

## Remaining Endpoints to Update

1. Account Operations:
   - [ ] `/acceptCredex`
   - [ ] `/acceptCredexBulk`
   - [ ] `/acceptRecurring`
   - [ ] `/cancelCredex`
   - [ ] `/cancelRecurring`
   - [ ] `/createCredex`
   - [ ] `/createRecurring`
   - [ ] `/declineCredex`
   - [ ] `/getAccountByHandle`
   - [ ] `/getCredex`
   - [ ] `/getMemberByHandle`
   - [ ] `/getRecurring`
   - [ ] `/setDCOparticipantRate`
   - [ ] `/unauthorizeForAccount`
   - [ ] `/updateSendOffersTo`

2. Admin Endpoints:
   - [ ] All endpoints in `/admin` directory
   - [ ] All endpoints in `/devadmin` directory

## Notes for Updates

1. Remove memberID parameters:
   - The server now extracts memberID from JWT
   - Update test files to remove memberID from parameters
   - Update usage messages accordingly

2. Update endpoint paths:
   - Remove module prefixes (e.g., /account, /member)
   - Keep admin prefixes for admin endpoints

3. Parameter handling:
   - First arg is phone for login (for JWT-protected endpoints)
   - Additional args are passed directly to test
   - Update test files to expect correct number of parameters

4. Response status codes:
   - 201 for resource creation (e.g., onboardMember)
   - 200 for other successful operations

5. Testing commands:
   - Always include phone first for JWT-protected endpoints
   - Include actual test parameters after phone
   - Example: `npm test <endpoint> <phone> [test params...]`

## Example Update Process

1. Check if endpoint needs JWT
2. Update endpoint path (remove module prefix if not admin)
3. Remove memberID parameter if present
4. Update parameter handling in test file
5. Update usage message
6. Test with appropriate parameters

This document will be updated as more endpoints are tested and patterns are refined.
