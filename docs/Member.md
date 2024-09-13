# Member

This module handles member-related operations in the Credex ecosystem. It exposes the following endpoints:

1. **onboardMember** (POST)

   - Function: Registers a new member in the Credex ecosystem and creates their personal consumption account.
   - Required variables:
     - firstname: string
     - lastname: string
     - phone: string
   - Optional variables:
     - DCOgiveInCXX: number (for setting up the DCO contribution)
     - DCOdenom: string (denomination for DCO contribution)

2. **getMemberDashboardByPhone** (GET)

   - Function: Retrieves a member's dashboard information and associated account dashboards using their phone number.
   - Required variables:
     - phone: string

3. **getMemberByHandle** (GET)

   - Function: Retrieves member information using their unique handle.
   - Required variables:
     - memberHandle: string

4. **updateMemberTier** (POST)

   - Function: Updates a member's tier status.
   - Required variables:
     - memberID: string
     - newTier: number

5. **authForTierSpendLimit** (POST)
   - Function: Authorizes secured credex for a member's tier.
   - Required variables:
     - issuerAccountID: string
     - amount: number
     - denom: string

These endpoints allow for member registration, information retrieval, tier management, and secured credex authorization within the Credex ecosystem. All controllers now include improved input validation, error handling, and logging for better reliability and maintainability.