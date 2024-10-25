# Credex

This module handles Credex-related operations in the Credex ecosystem. It exposes the following endpoints:

1. **offerCredex** (POST)

   - Function: Creates a new Credex offer.
   - Required variables:
     - memberID: string
     - issuerAccountID: string
     - receiverAccountID: string
     - Denomination: string
     - InitialAmount: number

2. **acceptCredex** (PUT)

   - Function: Accepts a Credex offer.
   - Required variables:
     - credexID: string
     - signerID: string

3. **acceptCredexBulk** (PUT)

   - Function: Accepts multiple Credex offers in bulk.
   - Required variables:
     - credexIDs: string[] (Array of credex IDs to accept)
     - signerID: string

4. **declineCredex** (PUT)

   - Function: Declines a Credex offer.
   - Required variables:
     - credexID: string

5. **cancelCredex** (PUT)

   - Function: Cancels a Credex offer.
   - Required variables:
     - credexID: string

6. **getCredex** (GET)

   - Function: Retrieves information about a specific Credex.
   - Required variables:
     - credexID: string
     - accountID: string

7. **getLedger** (GET)
   - Function: Retrieves ledger information for an account.
   - Required variables:
     - accountID: string
   - Optional variables:
     - numRows: number
     - startRow: number

These endpoints provide comprehensive Credex management capabilities within the ecosystem. The offerCredex endpoint allows for the creation of new Credex offers, while acceptCredex and acceptCredexBulk facilitate the acceptance of these offers individually or in bulk. The declineCredex and cancelCredex endpoints provide options for rejecting or withdrawing Credex offers. The getCredex endpoint allows for retrieving detailed information about a specific Credex, and getLedger provides access to an account's transaction history. Together, these endpoints enable the full lifecycle management of Credexes within the ecosystem, from creation and acceptance to cancellation and historical tracking.