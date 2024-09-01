1. GetAccountService:
  - Retrieve details of the account
  - 
2. GetMemberAccounts:
  - Retrieve accounts owned by user
  - 
3. GetMemberService:
  - retreive details of a member using memmberID
  -
4. GetSentCredexOffers:
  - using accountID retreive sent credexOffers
  - 
5. GetReceivedCredexOffers:
  - using accountID retreive received credexOffers
  - 
6. UpdateMemberTier:
  - Using MemmberHandle update MemberTier
  -
7. UpdateMemberStatus
  - using memberID/memberHandle change members suspended/active status
  -
8. UpdateAccountStatus:
  - using accountID/accountHandle change members
  -
9. GetAccountActivityLogService:
  **Purpose:** Retrieve a log of all activities related to a specific account, useful for auditing and support inquiries.
  **Parameters**: `accountID` (required), `dateRange` (optional)
  **Response:** Returns a list of activities including timestamps, actions taken, and any associated details.
10. ExportAccountData:
  **Purpose:** Export all account-related data for a member, useful for compliance with data portability regulations.
  **Parameters:** accountID, format (optional, e.g., CSV, JSON)
  **Response:** Provides a downloadable link to the exported data.
11. LogMemberInteraction:
  **Purpose:** Allow the operations team to log interactions with members, such as support calls, emails, or chat sessions.
  **Parameters:** memberID or memberHandle, interactionType, interactionDetails (required)
  **Response:** Confirms the interaction has been logged.
12. GetAccountActivityLog:
  **Purpose:** Retrieve a log of all activities related to a specific account, useful for auditing and support inquiries.
  **Parameters:** accountID (required), dateRange (optional)
  **Response:** Returns a list of activities including timestamps, actions taken, and any associated details.