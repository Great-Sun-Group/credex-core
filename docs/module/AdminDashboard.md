# AdminDashboard

The AdminDashboard module provides administrative functionalities for managing the Credex ecosystem. It includes endpoints for retrieving and managing information about accounts, members, and credexes.

## Endpoints

1. **getAccountDetails** (GET)
   - Function: Retrieves detailed information about a specific account.
   - Required parameters:
     - accountHandle or accountID

2. **getReceivedCredexOffers** (GET)
   - Function: Retrieves a list of received credex offers for a specific account.
   - Required parameters:
     - accountHandle or accountID

3. **getSentCredexOffers** (GET)
   - Function: Retrieves a list of sent credex offers for a specific account.
   - Required parameters:
     - accountHandle or accountID

4. **getMemberDetails** (GET)
   - Function: Retrieves detailed information about a specific member.
   - Required parameters:
     - memberHandle

5. **updateMemberTier** (POST)
   - Function: Updates the tier of a specific member.
   - Required parameters:
     - memberHandle
     - newTier

6. **getCredexDetails** (GET)
   - Function: Retrieves detailed information about a specific credex.
   - Required parameters:
     - credexID

## Services

The AdminDashboard module includes the following services:

1. **GetAccountService**: Retrieves account details.
2. **GetAccountReceivedCredexOffers**: Retrieves received credex offers for an account.
3. **GetAccountSentCredexOffers**: Retrieves sent credex offers for an account.
4. **GetMemberService**: Retrieves member details.
5. **UpdateMemberTierService**: Updates a member's tier.
6. **GetCredexService**: Retrieves credex details.
7. **GetMemberAccountsOwnerByMemberSevice**: Retrieves accounts owned by a member.

## Security

The AdminDashboard routes are protected by authentication middleware to ensure that only authorized users can access these administrative functions.

## Logging

All actions performed through the AdminDashboard are logged for auditing purposes, enhancing the transparency and accountability of administrative operations in the Credex ecosystem.

Note: The AdminDashboard module is designed for use by system administrators and should be accessed only by authorized personnel with appropriate permissions.