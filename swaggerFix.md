# Swagger Fixes Needed

## Path Prefix Issues
All routes have incorrect /api/{module}/ prefix that should be removed:
- /api/member/getMemberByHandle -> /getMemberByHandle
- /api/member/getMemberDashboardByPhone -> /getMemberDashboardByPhone
- /api/member/onboardMember -> /onboardMember
- /api/member/login -> /login
- /api/member/authForTierSpendLimit -> /authForTierSpendLimit
- /api/account/getAccountByHandle -> /getAccountByHandle
- /api/account/createAccount -> /createAccount
- /api/account/updateAccount -> /updateAccount
- /api/account/authorizeForAccount -> /authorizeForAccount
- /api/account/unauthorizeForAccount -> /unauthorizeForAccount
- /api/account/updateSendOffersTo -> /updateSendOffersTo
- /api/account/getLedger -> /getLedger
- /api/account/getBalances -> /getBalances
- /api/credex/createCredex -> /createCredex
- /api/credex/acceptCredex -> /acceptCredex
- /api/credex/acceptCredexBulk -> /acceptCredexBulk
- /api/credex/declineCredex -> /declineCredex
- /api/credex/cancelCredex -> /cancelCredex
- /api/credex/getCredex -> /getCredex

## Response Structure Issues

### Member Routes

#### getMemberByHandle
- Current shows specific memberData fields
- Should show generic memberData object to match controller response

#### getMemberDashboardByPhone
- Current shows memberDashboard fields directly
- Should show success/data/message wrapper with memberDashboard.data structure

#### onboardMember
- Current shows memberDashboard as generic object
- Should show success/data/message wrapper with memberDashboard.data structure
- Missing defaultAccountID in response

#### login
- Need to verify response structure against controller
- Should include success/data/message wrapper

#### authForTierSpendLimit
- Need to verify response structure against controller
- Should include success/data/message wrapper

### Account Routes

#### getAccountByHandle
- Current shows accountData with specific fields
- Should show generic accountData object to match controller response

#### createAccount
- Need to verify response structure against controller
- Should include success/data/message wrapper

#### updateAccount
- Need to verify response structure against controller
- Should include success/data/message wrapper

#### authorizeForAccount
- Need to verify response structure against controller
- Should include success/data/message wrapper

#### unauthorizeForAccount
- Need to verify response structure against controller
- Should include success/data/message wrapper

#### updateSendOffersTo
- Need to verify response structure against controller
- Should include success/data/message wrapper

#### getLedger
- Need to verify response structure against controller
- Should include success/data/message wrapper

#### getBalances
- Need to verify response structure against controller
- Should include success/data/message wrapper

### Credex Routes

#### createCredex
- Missing memberID from auth requirement
- Response missing dashboardData
- Response structure should be success/data/message with createCredexData and dashboardData

#### acceptCredex
- Missing signerID from auth requirement
- Response missing dashboardData
- Response structure should be success/data/message with acceptCredexData and dashboardData

#### acceptCredexBulk
- Response missing alreadyAccepted array
- Response missing dashboardData
- Response structure should be success/data/message with summary, acceptCredexData, and dashboardData

#### declineCredex
- Need to verify response structure against controller
- Should include success/data/message wrapper

#### cancelCredex
- Missing signerID from auth requirement
- Response shows more fields than controller returns
- Response should only include credexID in data object

#### getCredex
- Need to verify response structure against controller
- Should include success/data/message wrapper

## Authentication Issues
The following routes are missing authentication requirement in swagger:
- acceptCredex
- acceptCredexBulk
- createCredex
- cancelCredex
- declineCredex
- getLedger
- getBalances
- updateAccount
- authorizeForAccount
- unauthorizeForAccount
- updateSendOffersTo

## Validation Schema Issues
The following routes have swagger docs that don't match their validation schemas:

### Member Routes

#### createCredex
- Missing OFFERSorREQUESTS enum values
- Missing credexType enum values
- Missing dueDate format and pattern validation

#### acceptCredexBulk
- Missing array validation details (minItems, UUID format for items)

#### getMemberDashboardByPhone
- Missing phone pattern validation

#### onboardMember
- Missing name length validations
- Missing phone pattern validation

#### login
- Missing phone pattern validation

#### authForTierSpendLimit
- Need to verify all field validations

### Account Routes

#### createAccount
- Need to verify all field validations

#### updateAccount
- Need to verify all field validations

#### authorizeForAccount
- Need to verify all field validations

#### unauthorizeForAccount
- Need to verify all field validations

#### updateSendOffersTo
- Need to verify all field validations

#### getLedger
- Need to verify all field validations

#### getBalances
- Need to verify all field validations

### Credex Routes

#### declineCredex
- Need to verify all field validations

#### getCredex
- Need to verify all field validations
