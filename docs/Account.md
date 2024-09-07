# Account

This module handles account-related operations in the Credex ecosystem. It exposes the following endpoints:

1. **createAccount** (POST)

   - Function: Creates a new account in the Credex ecosystem.
   - Required variables:
     - ownerID: string
     - accountType: string
     - accountName: string
     - accountHandle: string
     - defaultDenom: string
   - Optional variables:
     - DCOgiveInCXX: number
     - DCOdenom: string

2. **getAccountByHandle** (GET)

   - Function: Retrieves account information using the account handle.
   - Required variables:
     - accountHandle: string

3. **updateAccount** (PATCH)

   - Function: Updates an existing account's information.
   - Required variables:
     - ownerID: string
     - accountID: string
   - Optional variables:
     - accountName: string
     - accountHandle: string
     - defaultDenom: string

4. **authorizeForAccount** (POST)

   - Function: Authorizes a member to perform actions on behalf of an account.
   - Required variables:
     - memberHandleToBeAuthorized: string
     - accountID: string
     - ownerID: string

5. **unauthorizeForAccount** (POST)

   - Function: Removes authorization for a member to act on behalf of an account.
   - Required variables:
     - memberIDtoBeUnauthorized: string
     - accountID: string
     - ownerID: string

6. **updateSendOffersTo** (POST)
   - Function: Updates the account's preference for receiving offers.
   - Required variables:
     - memberIDtoSendOffers: string
     - accountID: string
     - ownerID: string

These endpoints provide comprehensive account management capabilities within the Credex ecosystem. All controllers now include improved input validation, error handling, and logging for better reliability and maintainability. The controllers ensure that all calls to Account services go through them, enforcing proper access control and data validation.