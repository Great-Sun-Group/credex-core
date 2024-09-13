# Code Summary
Current Branch: prep-for-prod

## src/api/Account/controllers/authorizeForAccount.ts
```
export async function AuthorizeForAccountController(
    // Validate input
```

## src/api/Account/controllers/createAccount.ts
```
export async function CreateAccountController(
    // Validate input
```

## src/api/Account/controllers/getAccountByHandle.ts
```
export async function GetAccountByHandleController(
/**
 * Controller for retrieving an account by its handle
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
```

## src/api/Account/controllers/getAccountDashboard.ts
```
export async function GetAccountDashboardController(
```

## src/api/Account/controllers/unauthorizeForAccount.ts
```
export async function UnauthorizeForAccountController(
/**
 * Controller for unauthorizing a member for an account
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
    // Validate memberIDtoBeUnauthorized
    // Validate accountID
    // Validate ownerID
```

## src/api/Account/controllers/updateAccount.ts
```
export async function UpdateAccountController(
    // Validate input
```

## src/api/Account/controllers/updateSendOffersTo.ts
```
export async function UpdateSendOffersToController(
    // Validate input
```

## src/api/Account/services/AuthorizeForAccount.ts
```
export async function AuthorizeForAccountService(
    // Check that account authorization is permitted on membership tier
```

## src/api/Account/services/CreateAccount.ts
```
export async function CreateAccountService(
    //check that account creation is permitted on membership tier
```

## src/api/Account/services/GetAccountByHandle.ts
```
export async function GetAccountByHandleService(
```

## src/api/Account/services/GetAccountDashboard.ts
```
export async function GetAccountDashboardService(
```

## src/api/Account/services/GetBalances.ts
```
export async function GetBalancesService(accountID: string) {
      // Get all unique denominations from Credex nodes related to the account
      // Aggregate incoming secured amounts for each denomination ensuring uniqueness
      // Aggregate outgoing secured amounts for each denomination ensuring uniqueness
      // Calculate the total outgoing amount
      // Get the current day node which should have active status
      // Calculate the net secured balance for each denomination and return the result
```

## src/api/Account/services/UnauthorizeForAccount.ts
```
export async function UnauthorizeForCompanyService(
```

## src/api/Account/services/UpdateAccount.ts
```
export async function UpdateAccountService(
  // Validation: Check defaultDenom in denominations
```

## src/api/Account/services/UpdateSendOffersTo.ts
```
export async function UpdateSendOffersToService(
```

## src/api/Account/accountRoutes.ts
```
  /**
   * @swagger
   * /api/v1/createAccount:
   *   post:
   *     summary: Create a new account
   *     tags: [Accounts]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateAccountRequest'
   *     responses:
   *       200:
   *         description: Account created successfully
   *       400:
   *         description: Bad request
   *       429:
   *         description: Too many requests
   */
  /**
   * @swagger
   * /api/v1/getAccountByHandle:
   *   get:
   *     summary: Get account by handle
   *     tags: [Accounts]
   *     parameters:
   *       - in: query
   *         name: accountHandle
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Account retrieved successfully
   *       400:
   *         description: Bad request
   *       404:
   *         description: Account not found
   *       429:
   *         description: Too many requests
   */
  /**
   * @swagger
   * /api/v1/updateAccount:
   *   patch:
   *     summary: Update account information
   *     tags: [Accounts]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateAccountRequest'
   *     responses:
   *       200:
   *         description: Account updated successfully
   *       400:
   *         description: Bad request
   *       404:
   *         description: Account not found
   *       429:
   *         description: Too many requests
   */
  /**
   * @swagger
   * /api/v1/authorizeForAccount:
   *   post:
   *     summary: Authorize a member for an account
   *     tags: [Accounts]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AuthorizeForAccountRequest'
   *     responses:
   *       200:
   *         description: Member authorized successfully
   *       400:
   *         description: Bad request
   *       429:
   *         description: Too many requests
   */
  /**
   * @swagger
   * /api/v1/unauthorizeForAccount:
   *   post:
   *     summary: Unauthorize a member for an account
   *     tags: [Accounts]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UnauthorizeForAccountRequest'
   *     responses:
   *       200:
   *         description: Member unauthorized successfully
   *       400:
   *         description: Bad request
   *       429:
   *         description: Too many requests
   */
  /**
   * @swagger
   * /api/v1/updateSendOffersTo:
   *   post:
   *     summary: Update the member to receive offers for an account
   *     tags: [Accounts]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateSendOffersToRequest'
   *     responses:
   *       200:
   *         description: Send offers recipient updated successfully
   *       400:
   *         description: Bad request
   *       429:
   *         description: Too many requests
   */
```

## src/api/Account/accountValidationSchemas.ts
```
export const createAccountSchema = {
export const getAccountByHandleSchema = {
export const updateAccountSchema = {
export const authorizeForAccountSchema = {
export const unauthorizeForAccountSchema = {
export const updateSendOffersToSchema = {
```

## src/api/AdminDashboard/controllers/ControllerList.md
```
```

## src/api/AdminDashboard/controllers/AccountController.ts
```
export async function getAccountDetails(req: Request, res: Response, next: NextFunction) {
export async function getReceivedCredexOffers(req: Request, res: Response, next: NextFunction) {
export async function getSentCredexOffers(req: Request, res: Response, next: NextFunction) {
```

## src/api/AdminDashboard/controllers/CredexController.ts
```
export async function getCredexDetails(req: Request, res: Response, next: NextFunction) {
export async function updateCredexStatus(req: Request, res: Response, next: NextFunction) {
// Additional controller functions can be added here in the future
// Example:
/*
  // Add validation for newStatus when implemented
*/
```

## src/api/AdminDashboard/controllers/MemberController.ts
```
export async function getMemberDetails(req: Request, res: Response, next: NextFunction) {
export async function updateMemberTier(req: Request, res: Response, next: NextFunction) {
export async function updateMemberStatus(req: Request, res: Response, next: NextFunction) {
export async function logMemberInteraction(req: Request, res: Response, next: NextFunction) {
// Keep the commented out functions for future reference
/*
  // Add validation for newStatus when implemented
  // Add validation for interactionType and interactionDetails when implemented
*/
```

## src/api/AdminDashboard/services/ServicesList.md
```
  **Purpose:** Retrieve a log of all activities related to a specific account, useful for auditing and support inquiries.
  **Parameters**: `accountID` (required), `dateRange` (optional)
  **Response:** Returns a list of activities including timestamps, actions taken, and any associated details.
  **Purpose:** Export all account-related data for a member, useful for compliance with data portability regulations.
  **Parameters:** accountID, format (optional, e.g., CSV, JSON)
  **Response:** Provides a downloadable link to the exported data.
  **Purpose:** Allow the operations team to log interactions with members, such as support calls, emails, or chat sessions.
  **Parameters:** memberID or memberHandle, interactionType, interactionDetails (required)
  **Response:** Confirms the interaction has been logged.
  **Purpose:** Retrieve a log of all activities related to a specific account, useful for auditing and support inquiries.
  **Parameters:** accountID (required), dateRange (optional)
  **Response:** Returns a list of activities including timestamps, actions taken, and any associated details.
```

## src/api/AdminDashboard/services/GetAccountReceivedCredexOffers.ts
```
```

## src/api/AdminDashboard/services/GetAccountSentCredexOffers.ts
```
```

## src/api/AdminDashboard/services/GetAccountService.ts
```
```

## src/api/AdminDashboard/services/GetCredexService.ts
```
```

## src/api/AdminDashboard/services/GetMemberAccountsOwnerByMemberSevice.ts
```
```

## src/api/AdminDashboard/services/GetMemberService.ts
```
```

## src/api/AdminDashboard/services/UpdateMemberTierService.ts
```
  // Validate newTier
```

## src/api/AdminDashboard/adminDashboardRoutes.ts
```
```

## src/api/AdminDashboard/adminDashboardValidationSchemas.ts
```
export const getCredexSchema = {
export const getMemberSchema = {
export const updateMemberTierSchema = {
export const getAccountSchema = {
```

## src/api/Avatar/controllers/acceptRecurring.ts
```
export async function AcceptRecurringController(
/**
 * AcceptRecurringController
 *
 * This controller handles the acceptance of recurring transactions.
 * It validates the required fields, calls the AcceptRecurringService,
 * and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
    // Call AcceptRecurringService to process the acceptance
    // Check if the service call was successful
    // Fetch dashboard data
    // Return the acceptance data and dashboard data
```

## src/api/Avatar/controllers/cancelRecurring.ts
```
export async function DeclineRecurringController(
```

## src/api/Avatar/controllers/requestRecurring.ts
```
export async function RequestRecurringController(
/**
 * RequestRecurringController
 * 
 * This controller handles the creation of recurring payment requests.
 * It validates the input, calls the RequestRecurringService,
 * and returns the result along with updated dashboard data.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
```

## src/api/Avatar/services/AcceptRecurring.ts
```
interface AcceptRecurringParams {
interface AcceptRecurringResult {
export async function AcceptRecurringService(
/**
 * AcceptRecurringService
 *
 * This service handles the acceptance of a recurring transaction.
 * It updates the database to reflect the acceptance of the recurring avatar.
 *
 * @param params - An object containing avatarID, signerID, and requestId
 * @returns An object containing the result of the acceptance operation
 */
    // TODO: Implement notification for recurring acceptance
```

## src/api/Avatar/services/CancelRecurring.ts
```
export async function CancelRecurringService(
```

## src/api/Avatar/services/RequestRecurring.ts
```
interface RecurringParams {
export async function RequestRecurringService(
```

## src/api/Avatar/avatarValidationSchemas.ts
```
export const requestRecurringSchema = {
export const acceptRecurringSchema = {
export const cancelRecurringSchema = {
// Add more schemas as needed for other Avatar operations
```

## src/api/Avatar/recurringRoutes.ts
```
  /**
   * @swagger
   * /api/v1/requestRecurring:
   *   post:
   *     summary: Request a recurring payment
   *     tags: [Recurring]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RequestRecurring'
   *     responses:
   *       200:
   *         description: Recurring payment requested successfully
   *       400:
   *         description: Bad request
   */
  /**
   * @swagger
   * /api/v1/acceptRecurring:
   *   put:
   *     summary: Accept a recurring payment request
   *     tags: [Recurring]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AcceptRecurring'
   *     responses:
   *       200:
   *         description: Recurring payment accepted successfully
   *       400:
   *         description: Bad request
   */
  /**
   * @swagger
   * /api/v1/cancelRecurring:
   *   delete:
   *     summary: Cancel a recurring payment
   *     tags: [Recurring]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CancelRecurring'
   *     responses:
   *       200:
   *         description: Recurring payment cancelled successfully
   *       400:
   *         description: Bad request
   */
/**
 * @swagger
 * components:
 *   schemas:
 *     RequestRecurring:
 *       type: object
 *       required:
 *         - signerMemberID
 *         - requestorAccountID
 *         - counterpartyAccountID
 *         - InitialAmount
 *         - Denomination
 *         - nextPayDate
 *         - daysBetweenPays
 *       properties:
 *         signerMemberID:
 *           type: string
 *           format: uuid
 *         requestorAccountID:
 *           type: string
 *           format: uuid
 *         counterpartyAccountID:
 *           type: string
 *           format: uuid
 *         InitialAmount:
 *           type: number
 *         Denomination:
 *           type: string
 *         nextPayDate:
 *           type: string
 *           format: date
 *         daysBetweenPays:
 *           type: integer
 *         securedCredex:
 *           type: boolean
 *         credspan:
 *           type: integer
 *           minimum: 7
 *           maximum: 35
 *         remainingPays:
 *           type: integer
 *           minimum: 0
 *     AcceptRecurring:
 *       type: object
 *       required:
 *         - avatarID
 *         - signerID
 *       properties:
 *         avatarID:
 *           type: string
 *           format: uuid
 *         signerID:
 *           type: string
 *           format: uuid
 *     CancelRecurring:
 *       type: object
 *       required:
 *         - signerID
 *         - cancelerAccountID
 *         - avatarID
 *       properties:
 *         signerID:
 *           type: string
 *           format: uuid
 *         cancelerAccountID:
 *           type: string
 *           format: uuid
 *         avatarID:
 *           type: string
 *           format: uuid
 */
```

## src/api/Credex/controllers/acceptCredex.ts
```
export async function AcceptCredexController(
/**
 * AcceptCredexController
 * 
 * This controller handles the acceptance of Credex offers.
 * It validates the required fields, calls the AcceptCredexService,
 * and returns the result along with updated dashboard data.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
```

## src/api/Credex/controllers/acceptCredexBulk.ts
```
export async function AcceptCredexBulkController(
/**
 * AcceptCredexBulkController
 * 
 * This controller handles the bulk acceptance of multiple Credex offers.
 * It validates the required fields, calls the AcceptCredexService for each Credex,
 * fetches updated dashboard data, and returns the result.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
    // Filter out any null values
      // Assuming that memberID and acceptorAccountID are the same for all returned objects
      // Handle the case when there are no valid data returned from AcceptCredexService
```

## src/api/Credex/controllers/cancelCredex.ts
```
export async function CancelCredexController(
/**
 * CancelCredexController
 * 
 * This controller handles the cancellation of Credex offers.
 * It validates the required fields, calls the CancelCredexService,
 * and returns the result.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
```

## src/api/Credex/controllers/declineCredex.ts
```
export async function DeclineCredexController(
/**
 * DeclineCredexController
 * 
 * This controller handles the declining of Credex offers.
 * It validates the required fields, calls the DeclineCredexService,
 * and returns the result.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
```

## src/api/Credex/controllers/getCredex.ts
```
export async function GetCredexController(
/**
 * GetCredexController
 * 
 * This controller handles retrieving Credex details.
 * It validates the required fields, calls the GetCredexService,
 * and returns the result.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
```

## src/api/Credex/controllers/getLedger.ts
```
export async function GetLedgerController(
/**
 * GetLedgerController
 * 
 * This controller handles retrieving the ledger for an account.
 * It validates the required fields, calls the GetLedgerService,
 * and returns the result.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
```

## src/api/Credex/controllers/offerCredex.ts
```
export async function OfferCredexController(
/**
 * OfferCredexController
 *
 * This controller handles the creation of new Credex offers.
 * It validates the required fields, performs additional validations,
 * calls the OfferCredexService, and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
    // Validate input
    // Check if issuerAccountID and receiverAccountID are the same
    // Check due date for unsecured credex
    // Check secured credex limits based on membership tier
    // Check if unsecured credex is permitted on membership tier
    // Call OfferCredexService to create the Credex offer
    // Fetch updated dashboard data
    // Log successful Credex offer
    // Return the offer data and updated dashboard data
```

## src/api/Credex/services/AcceptCredex.ts
```
interface AcceptCredexResult {
export async function AcceptCredexService(
/**
 * AcceptCredexService
 *
 * This service handles the acceptance of a Credex offer.
 * It updates the Credex status from OFFERS to OWES and signs the acceptance.
 *
 * @param credexID - The ID of the Credex to be accepted
 * @param signerID - The ID of the Member or Avatar signing the acceptance
 * @param requestId - The ID of the HTTP request that initiated this operation
 * @returns An object with the accepted Credex details or null if the operation fails
 * @throws Error if there's an issue with the database operation
 */
      // Create digital signature
      // TODO: Implement credex accepted notification here
```

## src/api/Credex/services/CancelCredex.ts
```
export async function CancelCredexService(credexID: string, signerID: string, requestId: string): Promise<string | null> {
/**
 * CancelCredexService
 * 
 * This service handles the cancellation of a Credex offer or request.
 * It changes the relationships from OFFERS or REQUESTS to CANCELLED.
 * 
 * @param credexID - The ID of the Credex to be cancelled
 * @param signerID - The ID of the member or avatar cancelling the Credex
 * @param requestId - The ID of the HTTP request that initiated this operation
 * @returns The ID of the cancelled Credex or null if the operation fails
 * @throws Error if there's an issue with the database operation
 */
      // Create digital signature with audit log
```

## src/api/Credex/services/CreateCredex.ts
```
export async function CreateCredexService(credexData: any) {
    // Get securable data for secured credex
    // Create the credex
    // Add dueDate for unsecured credex
    // Add secured relationships for secured credex
```

## src/api/Credex/services/DeclineCredex.ts
```
export async function DeclineCredexService(credexID: string, signerID: string, requestId: string) {
    // Create digital signature
```

## src/api/Credex/services/GetCredex.ts
```
export async function GetCredexService(credexID: string, accountID: string) {
```

## src/api/Credex/services/GetLedger.ts
```
export async function GetLedgerService(
```

## src/api/Credex/services/GetPendingOffersIn.ts
```
interface OfferedCredex {
export async function GetPendingOffersInService(accountID: string) {
```

## src/api/Credex/services/GetPendingOffersOut.ts
```
interface OfferedCredex {
export async function GetPendingOffersOutService(accountID: string) {
```

## src/api/Credex/services/GetSecuredAuthorization.ts
```
export async function GetSecuredAuthorizationService(
/*
*/
    // Check if issuer is CREDEX_FOUNDATION_AUDITED
    // If the issuer is CREDEX_FOUNDATION_AUDITED, authorize for unlimited secured credex issuance
    // If issuer is not CREDEX_FOUNDATION_AUDITED, verify the available secured balance in denom
```

## src/api/Credex/services/OfferCredex.ts
```
interface CredexData {
export async function OfferCredexService(credexData: CredexData) {
/**
 * OfferCredexService
 *
 * This service handles the creation of a new Credex offer.
 * It uses the CreateCredexService to create the Credex and then
 * signs the offer and prepares it for notification.
 *
 * @param credexData - An object containing the data for the new Credex
 * @returns The result of the Credex offer creation
 */
    // Set default values for the Credex
    // Create the new Credex
    // Sign the Credex using the new digital signature utility
    // TODO: Implement offer notification here
```

## src/api/Credex/credexRoutes.ts
```
  /**
   * @swagger
   * /api/v1/offerCredex:
   *   post:
   *     summary: Offer a new Credex
   *     tags: [Credex]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - memberID
   *               - issuerAccountID
   *               - receiverAccountID
   *               - Denomination
   *               - InitialAmount
   *             properties:
   *               memberID:
   *                 type: string
   *               issuerAccountID:
   *                 type: string
   *               receiverAccountID:
   *                 type: string
   *               Denomination:
   *                 type: string
   *               InitialAmount:
   *                 type: number
   *               credexType:
   *                 type: string
   *               securedCredex:
   *                 type: boolean
   *               dueDate:
   *                 type: string
   *                 format: date
   *     responses:
   *       200:
   *         description: Credex offered successfully
   *       400:
   *         description: Bad request
   */
  /**
   * @swagger
   * /api/v1/acceptCredex:
   *   put:
   *     summary: Accept a Credex offer
   *     tags: [Credex]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - credexID
   *               - signerID
   *             properties:
   *               credexID:
   *                 type: string
   *               signerID:
   *                 type: string
   *     responses:
   *       200:
   *         description: Credex accepted successfully
   *       400:
   *         description: Bad request
   */
  /**
   * @swagger
   * /api/v1/acceptCredexBulk:
   *   put:
   *     summary: Accept multiple Credex offers in bulk
   *     tags: [Credex]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - credexIDs
   *               - signerID
   *             properties:
   *               credexIDs:
   *                 type: array
   *                 items:
   *                   type: string
   *               signerID:
   *                 type: string
   *     responses:
   *       200:
   *         description: Credexes accepted successfully
   *       400:
   *         description: Bad request
   */
  /**
   * @swagger
   * /api/v1/declineCredex:
   *   put:
   *     summary: Decline a Credex offer
   *     tags: [Credex]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - credexID
   *             properties:
   *               credexID:
   *                 type: string
   *     responses:
   *       200:
   *         description: Credex declined successfully
   *       400:
   *         description: Bad request
   */
  /**
   * @swagger
   * /api/v1/cancelCredex:
   *   put:
   *     summary: Cancel a Credex offer
   *     tags: [Credex]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - credexID
   *             properties:
   *               credexID:
   *                 type: string
   *     responses:
   *       200:
   *         description: Credex cancelled successfully
   *       400:
   *         description: Bad request
   */
  /**
   * @swagger
   * /api/v1/getCredex:
   *   get:
   *     summary: Get Credex details
   *     tags: [Credex]
   *     parameters:
   *       - in: query
   *         name: credexID
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: accountID
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Credex details retrieved successfully
   *       400:
   *         description: Bad request
   *       404:
   *         description: Credex not found
   */
  /**
   * @swagger
   * /api/v1/getLedger:
   *   get:
   *     summary: Get account ledger
   *     tags: [Credex]
   *     parameters:
   *       - in: query
   *         name: accountID
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: numRows
   *         schema:
   *           type: integer
   *       - in: query
   *         name: startRow
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Ledger retrieved successfully
   *       400:
   *         description: Bad request
   */
```

## src/api/Credex/credexValidationSchemas.ts
```
export const offerCredexSchema = {
export const acceptCredexSchema = {
export const declineCredexSchema = {
export const cancelCredexSchema = {
export const getCredexSchema = {
export const getLedgerSchema = {
// Add more schemas as needed for other Credex operations
```

## src/api/Member/controllers/authForTierSpendLimit.ts
```
export async function AuthForTierSpendLimitController(
export async function authForTierSpendLimitExpressHandler(
/**
 * Controller for authorizing secured credex for a member's tier
 * @param memberID - ID of the member
 * @param tier - Member's tier
 * @param Amount - Amount for authorization
 * @param Denomination - Denomination for authorization
 * @param requestId - Unique identifier for the request
 * @returns Object containing authorization status and message
 */
/**
 * Express middleware wrapper for secured credex authorization
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
```

## src/api/Member/controllers/getMemberByHandle.ts
```
export const GetMemberByHandleController = async (
```

## src/api/Member/controllers/getMemberDashboardByPhone.ts
```
export async function GetMemberDashboardByPhoneController(
/**
 * Controller for retrieving a member's dashboard by phone number
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
```

## src/api/Member/controllers/onboardMember.ts
```
export async function OnboardMemberController(
export async function onboardMemberExpressHandler(
    // Generate token
    // Save token to Neo4j
```

## src/api/Member/controllers/updateMemberTier.ts
```
export async function UpdateMemberTierController(
export async function updateMemberTierExpressHandler(
/**
 * Controller for updating a member's tier
 * @param memberID - ID of the member
 * @param tier - New tier for the member
 * @param requestId - Unique identifier for the request
 * @returns Object containing success status and message
 */
/**
 * Express middleware wrapper for updating a member's tier
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
```

## src/api/Member/controllers/loginMember.ts
```
export async function LoginMemberController(
export async function loginMemberExpressHandler(
```

## src/api/Member/services/AuthForTierSpendLimit.ts
```
export async function AuthForTierSpendLimitService(
        // If memberTier > 2, return true immediately as "result"
        // If memberTier <= 2, proceed with the larger search query and return calculated values in an object as "result"
```

## src/api/Member/services/GetMemberByHandle.ts
```
export async function GetMemberByHandleService(
```

## src/api/Member/services/GetMemberDashboardByPhone.ts
```
export async function GetMemberDashboardByPhoneService(phone: string) {
```

## src/api/Member/services/OnboardMember.ts
```
export async function OnboardMemberService(
    // Validation: Check defaultDenom in denominations
    // Type guard to narrow the type of error
```

## src/api/Member/services/UpdateMemberTier.ts
```
export async function UpdateMemberTierService(
```

## src/api/Member/services/LoginMember.ts
```
export async function LoginMemberService(phone: string): Promise<{ token?: string; error?: string }> {
    // Update the token in the database
```

## src/api/Member/memberRoutes.ts
```
const router = express.Router();
/**
 * @openapi
 * /member/login:
 *   post:
 *     tags:
 *       - Member
 *     summary: Login a member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 */
/**
 * @openapi
 * /member/getMemberByHandle:
 *   post:
 *     tags:
 *       - Member
 *     summary: Get member by handle
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberHandle
 *             properties:
 *               memberHandle:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
/**
 * @openapi
 * /member/getMemberDashboardByPhone:
 *   post:
 *     tags:
 *       - Member
 *     summary: Get member dashboard by phone
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
/**
 * @openapi
 * /member/onboardMember:
 *   post:
 *     tags:
 *       - Member
 *     summary: Onboard a new member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - lastname
 *               - phone
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 */
/**
 * @openapi
 * /member/updateMemberTier:
 *   post:
 *     tags:
 *       - Member
 *     summary: Update member tier
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberID
 *               - tier
 *             properties:
 *               memberID:
 *                 type: string
 *               tier:
 *                 type: number
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
/**
 * @openapi
 * /member/authForTierSpendLimit:
 *   post:
 *     tags:
 *       - Member
 *     summary: Authorize secured credex for member's tier
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberID
 *               - tier
 *               - Amount
 *               - Denomination
 *             properties:
 *               memberID:
 *                 type: string
 *               tier:
 *                 type: number
 *               Amount:
 *                 type: number
 *               Denomination:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
```

## src/api/Member/memberValidationSchemas.ts
```
export const getMemberByHandleSchema = {
export const getMemberDashboardByPhoneSchema = {
export const onboardMemberSchema = {
export const updateMemberTierSchema = {
export const authForTierSpendLimitSchema = {
export const loginMemberSchema = {
/**
 * Member Validation Schemas
 * 
 * This file contains validation schemas for various Member-related operations.
 * These schemas are used by the validateRequest middleware to ensure that
 * incoming requests have the correct structure and data types before they
 * reach the controllers.
 * 
 * While this file doesn't contain direct logging statements, it plays a crucial
 * role in the application's error handling and logging process:
 * 
 * 1. It helps prevent invalid data from reaching the controllers, reducing the
 *    need for error logging due to data validation issues.
 * 2. When used with the validateRequest middleware, it ensures that any validation
 *    errors are logged consistently across the application.
 * 3. By centralizing validation logic, it makes it easier to update and maintain
 *    data validation rules, which in turn affects what gets logged as errors.
 */
```

## src/constants/accountTypes.ts
```
export const accountTypes = ["PERSONAL_CONSUMPTION", "BUSINESS", "CREDEX_FOUNDATION"];
export function checkPermittedAccountType(credexTypeToCheck: string): boolean {
```

## src/constants/credexTypes.ts
```
export const credexTypes = [
export function checkPermittedCredexType(credexTypeToCheck: string): boolean {
```

## src/constants/denominations.ts
```
type DenomOptions = {
export type Denomination = {
const denominations: Denomination[] = [
export function getDenominations(
export const getFullDescription = (code: string): string | undefined => {
export const isValidDenomination = (code: string): boolean => {
/**
 * Options for querying denominations.
 */
/**
 * Represents a currency denomination.
 */
/**
 * Array of supported denominations in the Credex system.
 */
/**
 * Retrieves denominations based on provided options.
 * @param options - Options for filtering denominations.
 * @returns An array of Denomination objects or a comma-separated string of denomination codes.
 */
/**
 * Retrieves the full description of a denomination by its code.
 * @param code - The denomination code.
 * @returns The full description of the denomination, or undefined if not found.
 */
/**
 * Checks if a given code is a valid denomination.
 * @param code - The denomination code to check.
 * @returns True if the code is a valid denomination, false otherwise.
 */
```

## src/constants/credspan.ts
```
export const credspan = 35;
export async function checkDueDate(dueDate: any): Promise<boolean> {
```

## src/core-cron/DCO/DCOsnapshots/2021-01-02_ledgerSpace_dev_end.json
```
```

## src/core-cron/DCO/DCOsnapshots/placeholder.ts
```
//placeholder
```

## src/core-cron/DCO/DBbackup.ts
```
const exportDatabase = async (
export const createNeo4jBackup = async (
```

## src/core-cron/DCO/DBinitialization.ts
```
export async function DBinitialization(): Promise<void> {
async function setupDatabaseConstraints(
function establishDayZero(requestId: string): string {
async function fetchAndProcessRates(dayZero: string, requestId: string): Promise<any> {
async function createDayZeroDaynode(
async function createInitialAccounts(
async function createRdubsAccount(requestId: string): Promise<{
async function createCredexFoundation(
async function createGreatSun(
async function createVimbisoPay(
async function createInitialRelationships(
async function createInitialCredex(
/**
 * Initializes the database for the Daily Credcoin Offering (DCO) process.
 * This function sets up necessary constraints, creates initial accounts,
 * and establishes the starting state for the DCO.
 */
/**
 * Sets up necessary database constraints and indexes.
 */
  // Remove any current db constraints
  // Set new constraints
/**
 * Establishes the day zero date.
 */
/**
 * Fetches and processes currency rates for day zero.
 */
/**
 * Creates the day zero daynode in the database.
 */
/**
 * Creates initial accounts and relationships for the DCO process.
 */
// ... [rest of the code remains unchanged] ...
```

## src/core-cron/DCO/DCOavatars.ts
```
interface Avatar {
interface CredexOfferResult {
interface AvatarData {
export async function DCOavatars(): Promise<void> {
async function getActiveRecurringAvatars(session: Session): Promise<AvatarData[]> {
async function processAvatar(session: Session, avatarData: AvatarData): Promise<void> {
function prepareOfferData(avatar: Avatar, issuerAccountID: string, acceptorAccountID: string, date: string, requestId: string): any {
async function createCredexOffer(offerData: any): Promise<CredexOfferResult> {
async function acceptCredexOffer(credexID: string, avatarMemberID: string, requestId: string): Promise<void> {
async function deleteMarkedAuthorizations(session: Session, requestId: string, avatarId: string): Promise<void> {
/**
 * DCOavatars function
 * This function is run as a cronjob every 24 hours to process recurring avatars.
 * It identifies active recurring avatars, creates credexes, and updates their status.
 */
    // Reduce remainingPays by 1 if it exists
    // Calculate the new nextPayDate
    // Update nextPayDate
    // Check if the avatar should be marked as completed
    // TODO: Implement member notification about the failure
```

## src/core-cron/DCO/DCOexecute.ts
```
interface Rates {
interface Participant {
export async function DCOexecute(): Promise<boolean> {
async function waitForMTQCompletion(session: any): Promise<void> {
async function setDCORunningFlag(
async function resetDCORunningFlag(session: any): Promise<void> {
async function handleDefaultingCredexes(session: any): Promise<void> {
async function expirePendingOffers(session: any): Promise<void> {
async function fetchCurrencyRates(nextDate: string): Promise<Rates> {
function validateRates(rates: Rates): void {
async function processDCOParticipants(
async function createNewDaynode(
async function updateCredexBalances(
async function getFoundationData(
async function processDCOTransactions(
/**
 * Executes the Daily Credcoin Offering (DCO) process.
 * This function handles the daily operations of the Credcoin system,
 * including rate updates, participant validation, and transaction processing.
 */
  // Update ledger space
    // Update CXX credexes
    // Update currency credexes
    // Update CXX :REDEEMED relationships
    // Update currency :REDEEMED relationships
    // Update CXX :CREDLOOP relationships
    // Update currency :CREDLOOP relationships
    // Update loop anchors (always CXX)
  // Update search space
  // Process DCO give transactions
      // Log the offer creation
      // Log the credex acceptance
  // Process DCO receive transactions
      // Log the offer creation
      // Log the credex acceptance
// ... [rest of the file remains unchanged]
```

## src/core-cron/DCO/DailyCredcoinOffering.ts
```
export async function DailyCredcoinOffering(): Promise<{ success: boolean, error?: string }> {
async function checkActiveDaynode(session: any): Promise<boolean> {
async function resetDCORunningFlag(session: any): Promise<void> {
/**
 * Executes the Daily Credcoin Offering (DCO) process.
 * This function checks for an active daynode, initializes the database if necessary,
 * and runs the DCO execution and avatar update processes.
 * 
 * @returns {Promise<{ success: boolean, error?: string }>} Returns an object indicating success and any error message.
 */
    // Check for active daynode
/**
 * Checks if an active daynode exists in the database.
 * 
 * @param {Neo4jSession} session - The Neo4j session to use for the query.
 * @returns {Promise<boolean>} Returns true if an active daynode exists, false otherwise.
 */
/**
 * Resets the DCOrunningNow flag on the active daynode.
 * 
 * @param {Neo4jSession} session - The Neo4j session to use for the query.
 */
```

## src/core-cron/DCO/fetchZwgRate.ts
```
const https = require("https");
export interface ExchangeRate {
const RBZ_URL = "https://www.rbz.co.zw/index.php";
const httpsAgent = new https.Agent({
function isValidRate(rate: string): boolean {
function validateRates(rates: ExchangeRate[]): void {
export class ZwgRateError extends Error {
export async function fetchZwgRate(): Promise<ExchangeRate[]> {
```

## src/core-cron/MTQ/LoopFinder.ts
```
export async function LoopFinder(
function getSearchOwesType(credexSecuredDenom: string): string {
async function adjustCredexDueDate(session: neo4j.Session, credexSecuredDenom: string, credexDueDate: string): Promise<string> {
async function createOrUpdateSearchSpaceCredex(
async function checkCredexExists(session: neo4j.Session, credexID: string): Promise<boolean> {
async function createSearchSpaceCredex(
async function findCredloop(session: neo4j.Session, issuerAccountID: string, searchOwesType: string): Promise<{ valueToClear: number; credexesInLoop: string[]; credexesRedeemed: string[] }> {
async function processCredloop(ledgerSpaceSession: neo4j.Session, searchSpaceSession: neo4j.Session, valueToClear: number, credexesInLoop: string[], credexesRedeemed: string[]): Promise<void> {
async function cleanupSearchSpace(session: neo4j.Session, credexesRedeemed: string[]): Promise<void> {
async function updateLedgerSpace(session: neo4j.Session, valueToClear: number, credexesInLoop: string[], credexesRedeemed: string[]): Promise<void> {
async function markCredexAsProcessed(session: neo4j.Session, credexID: string): Promise<void> {
async function createNotifications(session: neo4j.Session, loopID: string): Promise<void> {
    // Step 1: Find all loops starting and ending at the specified account, with the specified searchOwesType
    // Step 3: Filter loops to include only those containing a node with the earliest earliestDueDate
    // Step 4: Return only the longest loop, breaking ties with rand()
    // Step 5: Each node returns the credex it is connected to with the earliest dueDate
    // on tie, credex with largest amount
    // Step 6: Identify the minimum outstandingAmount and subtract it from all credexes
    // Step 7: Collect all credexes and filter those with outstandingAmount = 0.
    //Step 8: collect credexIDs of the zeroCredexes
    // Step 10: Delete zeroCredexes
    // Step 11: Handle orphaned searchAnchors
    // Step 12: Update earliestDueDate on remaining searchAnchors
// TODO: Implement notification system
/*
  // Implementation for creating notifications
*/
```

## src/core-cron/MTQ/MinuteTransactionQueue.ts
```
interface Account {
interface Credex {
export async function MinuteTransactionQueue(): Promise<boolean> {
async function checkDCOAndMTQStatus(
async function setMTQRunningFlag(
async function processQueuedAccounts(
async function getQueuedAccounts(session: any): Promise<Account[]> {
async function createAccountInSearchSpace(
async function markAccountAsProcessed(
async function processQueuedCredexes(
async function getQueuedCredexes(session: any): Promise<Credex[]> {
```

## src/core-cron/cronJobs.ts
```
  // Running DailyCredcoinOffering every day at midnight UTC
  // Running MinuteTransactionQueue every minute
```

## src/tests/controllers/checkLedgerVsSearchBalances.ts
```
export async function CheckLedgerVsSearchBalancesController(
    // Send a success response
    // Handle errors and send an appropriate error response
```

## src/tests/controllers/clearDevDb.ts
```
export async function ClearDevDbController(
    // Call the service to clear the development database
    // Send a success response
    // Handle errors and send an appropriate error response
```

## src/tests/controllers/createRandomFloatingCredexes.ts
```
export async function CreateRandomFloatingCredexesController(
  // Check if numNewTransactions is provided in the request body
    // Call the service to create test transactions
    // Send the response with the created test transactions
    // Handle errors and send an appropriate error response
```

## src/tests/controllers/createTestLoop.ts
```
export async function CreateTestLoopController(
  // Check if numNewTransactions is provided in the request body
    // Call the service to create test transactions
    // Send the response with the created test transactions
    // Handle errors and send an appropriate error response
```

## src/tests/controllers/createTestMembersAndAccounts.ts
```
export async function CreateTestMembersAndAccountsController(
  // Check if numNewAccounts is provided in the request body
    // Call the service to create test accounts
    // Send the response with the created test accounts
    // Handle errors and send an appropriate error response
```

## src/tests/controllers/forceDCO.ts
```
export async function ForceDcoController(
```

## src/tests/controllers/forceMTQ.ts
```
export async function ForceMtqController(
```

## src/tests/controllers/growthTest.ts
```
export async function GrowthTestController(
    // Handle errors and send an appropriate error response
```

## src/tests/controllers/offerAndAcceptCredex.ts
```
export async function OfferAndAcceptCredexController(
    /*
      */
```

## src/tests/integration/account.test.ts
```
    // Set up any necessary test data
    // Clean up test data and close connections
  // Add more test cases for other account-related endpoints
```

## src/tests/services/CheckLedgerVsSearchBalances.ts
```
export async function CheckLedgerVsSearchBalances() {
    // Query ledgerSpace for credex data
    // Query searchSpace for credex data
    // Process ledgerSpace results
    // Process searchSpace results
    // Create a map for quick lookup from searchSpace
    // Compare and analyze the data
      // If the credex does not exist in searchSpace and the amount in ledgerSpace is 0, count as a match
    // Return the results
```

## src/tests/services/ClearDevDb.ts
```
export async function ClearDevDbService() {
  //check success first
```

## src/tests/services/CreateRandomFloatingCredexes.ts
```
async function getDateAndRandCounterparties() {
export async function CreateRandomFloatingCredexesService(
  /*
        // floating credex due in 8-34 days
    // Process in batches of `batchSize`
  */
```

## src/tests/services/CreateTestLoop.ts
```
export async function CreateTestLoopService(numNewTransactions: number) {
  /*
  // Iterate numNewTransactions times
      //securedCredex: true,
  */
```

## src/tests/services/CreateTestMembersAndAccounts.ts
```
export async function CreateTestMembersAndAccountsService(numNewAccounts: number) {
        // Fetch a new name for each iteration
        // comment out when daily limit reached        
        /*
        // comment out when name coming from query above
        */
        // need to check if phone unique here and generate new if not
    // Process in batches of `batchSize`
    // Process in batches of `batchSize`
```

## src/tests/services/GrowthTest.ts
```
export async function GrowthTestService(variables: any) {
    // Get current number of accounts
```

## src/tests/services/InEcosystemSecuredCredexes.ts
```
export async function InEcosystemSecuredCredexesService(
  /*
            // Handle error as needed
*/
```

## src/tests/services/PurchaseSecuredCredexes.ts
```
export async function PurchaseSecuredCredexesService(
  /*
        // Step 1: Select a random audited account
        // Step 2: Collect account IDs for purchasers
  */
```

## src/tests/services/SellSecuredCredexes.ts
```
export async function SellSecuredCredexesService(
  /*
            // Handle error as needed
  */
```

## src/tests/utils/denomUtils.test.ts
```
```

## src/tests/utils/validators.test.ts
```
```

## src/utils/configUtils.ts
```
interface Config {
class ConfigUtils {
export const configUtils = ConfigUtils.getInstance();
// Load environment variables from .env file
  // Add other configuration properties as needed
      // Initialize other configuration properties here
  // Add basic validation for required fields
    // Validate nested objects
```

## src/utils/denomUtils.ts
```
export const denomFormatter = (amount: number, code: string): string => {
/**
 * Formats a numerical amount according to the specified denomination.
 * @param amount - The numerical amount to format.
 * @param code - The denomination code.
 * @returns A formatted string representation of the amount.
 */
  // Ensure amount is a finite number
  /**
   * Formats a currency amount with the specified precision and regionalization.
   * @param amount - The amount to format.
   * @param precision - The number of decimal places to round to.
   * @param regionalization - The locale string for number formatting.
   * @returns A formatted string representation of the amount.
   */
    // This function needs to be imported from denominations.ts
    // For now, we'll just return a mock implementation
```

## src/utils/digitalSignature.ts
```
export async function digitallySign(
export async function getSignerMember(
```

## src/utils/errorUtils.ts
```
export function isNeo4jError(
export class ApiError extends Error {
// Type guard to check if an error is a Neo4j error
```

## src/utils/logger.ts
```
const logger = winston.createLogger({
function sanitizeData(data: any): any {
export const logInfo = (message: string, meta?: any) => {
export const logError = (message: string, error: Error, meta?: any) => {
export const logWarning = (message: string, meta?: any) => {
export const logDebug = (message: string, meta?: any) => {
export const addRequestId = (req: Request, res: Response, next: NextFunction) => {
export const expressLogger = (req: Request, res: Response, next: NextFunction) => {
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
export const logDCORates = (
// Configure the logger
// Add console transport for non-production environments
// Standardized logging functions
// Extend the Express Request interface
// Request ID middleware
// Express request logger middleware
// Error logger middleware
// Function to log DCO rates
// TODO: Implement log aggregation and centralized logging for production environments
// TODO: Implement log retention policies based on compliance requirements
// TODO: Add performance monitoring for database queries and external API calls
// TODO: Implement log analysis tools to detect patterns, anomalies, and potential security threats
```

## src/utils/update_code_summary.sh
```
```

## src/utils/validators.ts
```
export function validateUUID(uuid: string): boolean {
export function validateMemberHandle(handle: string): boolean {
export function validateAccountName(name: string): boolean {
export function validateAccountHandle(handle: string): boolean {
export function validateEmail(email: string): boolean {
export function validatePhone(phone: string): boolean {
export function validateAmount(amount: number): boolean {
export function validateDenomination(denomination: string): boolean {
export function validateCredexType(type: string): boolean {
export function validateName(name: string): boolean {
export function validateTier(tier: number): boolean {
export function validatePositiveInteger(value: number): boolean {
```

## src/index.ts
```
export const app = express();
const jsonParser = bodyParser.json();
export const apiVersionOneRoute = "/api/v1/";
const limiter = rateLimit({
const server = http.createServer(app);
// Import required modules and dependencies
// Create an Express application
// Create a JSON parser middleware
// Define the API version route prefix
// Apply security middleware
// Apply custom logging middleware
// Serve Swagger UI for API documentation
// Apply authentication middleware to all routes under the API version prefix
// Set up rate limiting to prevent abuse
// NOTE: With all requests coming from a single WhatsApp chatbot, rate limiting might cause issues
// Consider adjusting or removing rate limiting based on your specific use case
// Start cron jobs for scheduled tasks (e.g., daily credcoin offering, minute transaction queue)
// Apply route handlers for different modules
// Apply error handling middleware
// Create HTTP server
// Start the server
// Handle uncaught exceptions
  // Perform any necessary cleanup
  // TODO: Implement a more robust error reporting mechanism (e.g., send to a monitoring service)
  // Gracefully shut down the server
// Handle unhandled rejections
  // Perform any necessary cleanup
  // TODO: Implement a more robust error reporting mechanism (e.g., send to a monitoring service)
// Implement graceful shutdown
    // Perform any additional cleanup (e.g., close database connections)
```

## src/middleware/errorHandler.ts
```
export interface AppError extends Error {
export const errorHandler = (err: AppError, req: Request, res: Response, _next: NextFunction) => {
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
```

## src/middleware/rateLimiter.ts
```
const apiLimiter = rateLimit({
export const rateLimiter = (
  // Apply rate limiting to all requests
```

## src/middleware/validateRequest.ts
```
type ValidatorFunction = (value: any) => boolean;
type ValidationSchema = {
function validateObject(obj: any, schema: ValidationSchema): string | null {
export function validateRequest(schema: ValidationSchema, source: 'body' | 'query' | 'params' = 'body') {
export const v = validators;
```

## config/authenticate.ts
```
interface UserRequest extends Request {
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRATION = '15m';
const generateToken = (memberId: string): string => {
const verifyToken = (token: string): any => {
const authenticate = async (req: UserRequest, res: Response, next: NextFunction) => {
export const generateRandomSecret = (): string => {
// Use the JWT_SECRET from environment variable, or generate a warning if not set
// Set token expiration to 15 minutes
// Function to generate a random JWT secret
```

## config/baseLogger.ts
```
const baseLogger = winston.createLogger({
// Configure the base logger
```

## config/config.ts
```
function validateEnv(requiredVars: string[]): { [key: string]: string } {
const requiredEnvVars = [
const validatedEnv = validateEnv(requiredEnvVars);
export const config = {
  // Server configuration
  // Neo4j database configuration
  // External API configuration
  // Rate limiting configuration
  // Cron job schedules
// Log configuration (excluding sensitive information)
```

## config/logger.ts
```
const logger = baseLogger;
function sanitizeData(data: any): any {
export const addRequestId = (req: any, res: any, next: any) => {
export const expressLogger = (req: any, res: any, next: any) => {
export const errorLogger = (err: Error, req: any, res: any, next: any) => {
export const logDCORates = (XAUrate: number, CXXrate: number, CXXmultiplier: number) => {
// Enhance the baseLogger with additional configuration
// Add file transports for production environment
  // For non-production environments, we've already added Console transport in baseLogger
/**
 * Middleware for adding a unique request ID
 */
/**
 * Middleware for logging Express requests
 */
/**
 * Middleware for logging errors
 */
/**
 * Function to log DCO rates
 */
// TODO: Implement log aggregation and centralized logging for production environments
// TODO: Implement log retention policies based on compliance requirements
// TODO: Add performance monitoring for database queries and external API calls
// TODO: Implement log analysis tools to detect patterns, anomalies, and potential security threats
```

## config/neo4j.ts
```
const ledgerSpace = configUtils.get('ledgerSpace');
const searchSpace = configUtils.get('searchSpace');
const createDriverWithRetry = (url: string, user: string, password: string) => {
export const ledgerSpaceDriver = createDriverWithRetry(
export const searchSpaceDriver = createDriverWithRetry(
  // Verify connectivity on first use
// Graceful shutdown
```

## config/swagger.ts
```
const options: swaggerJsdoc.Options = {
export const swaggerSpec = swaggerJsdoc(options);
```

## docs/Account.md
```
```

## docs/Avatar.md
```
```

## docs/Credex.md
```
```

## docs/Daily_Credcoin_Offering_(DCO).md
```
```

## docs/DevAdmin.md
```
```

## docs/MinuteTransactionQueue_(MTQ).md
```
```

## docs/api_validation.md
```
```

## docs/ledgerSpace_schema.md
```
```

## docs/searchSpace_schema.md
```
```

## docs/AdminDashboard.md
```
```

## docs/Member.md
```
```

## docs/logging_best_practices.md
```
     // Some operation
   // Good
   // Avoid
```

## docs/code_summary.md
```
```

## build/config/baseLogger.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const winston_1 = __importDefault(require("winston"));
const baseLogger = winston_1.default.createLogger({
// Configure the base logger
//# sourceMappingURL=baseLogger.js.map
```

## build/config/config.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const dotenv_1 = __importDefault(require("dotenv"));
const baseLogger_1 = __importDefault(require("./baseLogger"));
function validateEnv(requiredVars) {
const requiredEnvVars = [
const validatedEnv = validateEnv(requiredEnvVars);
    // Server configuration
    // Neo4j database configuration
    // External API configuration
    // Rate limiting configuration
    // Cron job schedules
// Log configuration (excluding sensitive information)
//# sourceMappingURL=config.js.map
```

## build/config/logger.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const config_1 = require("./config");
const uuid_1 = require("uuid");
const baseLogger_1 = __importDefault(require("./baseLogger"));
const logger = baseLogger_1.default;
function sanitizeData(data) {
const addRequestId = (req, res, next) => {
const expressLogger = (req, res, next) => {
const errorLogger = (err, req, res, next) => {
const logDCORates = (XAUrate, CXXrate, CXXmultiplier) => {
// Enhance the baseLogger with additional configuration
// Add file transports for production environment
    // For non-production environments, we've already added Console transport in baseLogger
/**
 * Middleware for adding a unique request ID
 */
/**
 * Middleware for logging Express requests
 */
/**
 * Middleware for logging errors
 */
/**
 * Function to log DCO rates
 */
// TODO: Implement log aggregation and centralized logging for production environments
// TODO: Implement log retention policies based on compliance requirements
// TODO: Add performance monitoring for database queries and external API calls
// TODO: Implement log analysis tools to detect patterns, anomalies, and potential security threats
//# sourceMappingURL=logger.js.map
```

## build/config/neo4j.js
```
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
var __importStar = (this && this.__importStar) || function (mod) {
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j = __importStar(require("neo4j-driver"));
const configUtils_1 = __importDefault(require("../src/utils/configUtils"));
const logger_1 = __importDefault(require("./logger"));
const ledgerSpace = configUtils_1.default.get('ledgerSpace');
const searchSpace = configUtils_1.default.get('searchSpace');
const createDriverWithRetry = (url, user, password) => {
    // Verify connectivity on first use
// Graceful shutdown
//# sourceMappingURL=neo4j.js.map
```

## build/config/authenticate.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const logger_1 = __importDefault(require("./logger"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const neo4j_1 = require("./neo4j");
const crypto_1 = __importDefault(require("crypto"));
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRATION = '15m';
const generateToken = (memberId) => {
const verifyToken = (token) => {
const authenticate = async (req, res, next) => {
const generateRandomSecret = () => {
// Use the JWT_SECRET from environment variable, or generate a warning if not set
// Set token expiration to 15 minutes
// Function to generate a random JWT secret
//# sourceMappingURL=authenticate.js.map
```

## build/config/swagger.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const config_1 = require("./config");
const logger_1 = __importDefault(require("./logger"));
const options = {
//# sourceMappingURL=swagger.js.map
```

## build/src/utils/configUtils.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("../../config/logger"));
class ConfigUtils {
// Load environment variables from .env file
            // Initialize other configuration properties here
    // Add basic validation for required fields
        // Validate nested objects
//# sourceMappingURL=configUtils.js.map
```

## build/src/utils/validators.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const credexTypes_1 = require("../constants/credexTypes");
const denominations_1 = require("../constants/denominations");
const logger_1 = __importDefault(require("../../config/logger"));
function validateUUID(uuid) {
function validateMemberHandle(handle) {
function validateAccountName(name) {
function validateAccountHandle(handle) {
function validateEmail(email) {
function validatePhone(phone) {
function validateAmount(amount) {
function validateDenomination(denomination) {
function validateCredexType(type) {
function validateName(name) {
function validateTier(tier) {
function validatePositiveInteger(value) {
//# sourceMappingURL=validators.js.map
```

## build/src/utils/denomUtils.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const logger_1 = __importDefault(require("../../config/logger"));
const denomFormatter = (amount, code) => {
/**
 * Formats a numerical amount according to the specified denomination.
 * @param amount - The numerical amount to format.
 * @param code - The denomination code.
 * @returns A formatted string representation of the amount.
 */
    // Ensure amount is a finite number
    /**
     * Formats a currency amount with the specified precision and regionalization.
     * @param amount - The amount to format.
     * @param precision - The number of decimal places to round to.
     * @param regionalization - The locale string for number formatting.
     * @returns A formatted string representation of the amount.
     */
        // This function needs to be imported from denominations.ts
        // For now, we'll just return a mock implementation
//# sourceMappingURL=denomUtils.js.map
```

## build/src/utils/logger.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const config_1 = require("../../config/config");
const uuid_1 = require("uuid");
const logger = winston_1.default.createLogger({
function sanitizeData(data) {
const logInfo = (message, meta) => {
const logError = (message, error, meta) => {
const logWarning = (message, meta) => {
const logDebug = (message, meta) => {
const addRequestId = (req, res, next) => {
const expressLogger = (req, res, next) => {
const errorLogger = (err, req, res, next) => {
const logDCORates = (XAUrate, CXXrate, CXXmultiplier) => {
// Configure the logger
// Add console transport for non-production environments
// Standardized logging functions
// Request ID middleware
// Express request logger middleware
// Error logger middleware
// Function to log DCO rates
// TODO: Implement log aggregation and centralized logging for production environments
// TODO: Implement log retention policies based on compliance requirements
// TODO: Add performance monitoring for database queries and external API calls
// TODO: Implement log analysis tools to detect patterns, anomalies, and potential security threats
//# sourceMappingURL=logger.js.map
```

## build/src/utils/errorUtils.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const logger_1 = __importDefault(require("../../config/logger"));
function isNeo4jError(error) {
class ApiError extends Error {
// Type guard to check if an error is a Neo4j error
//# sourceMappingURL=errorUtils.js.map
```

## build/src/utils/digitalSignature.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const logger_1 = __importDefault(require("../../config/logger"));
async function digitallySign(session, signerID, entityType, entityId, actionType, inputData, requestId) {
async function getSignerMember(session, signerID) {
//# sourceMappingURL=digitalSignature.js.map
```

## build/src/api/Member/services/GetMemberByHandle.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function GetMemberByHandleService(memberHandle) {
//# sourceMappingURL=GetMemberByHandle.js.map
```

## build/src/api/Member/services/GetMemberDashboardByPhone.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const denomUtils_1 = require("../../../utils/denomUtils");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function GetMemberDashboardByPhoneService(phone) {
//# sourceMappingURL=GetMemberDashboardByPhone.js.map
```

## build/src/api/Member/services/UpdateMemberTier.js
```
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
var __importStar = (this && this.__importStar) || function (mod) {
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const neo4j = __importStar(require("neo4j-driver"));
const logger_1 = __importDefault(require("../../../../config/logger"));
async function UpdateMemberTierService(memberIDtoUpdate, newTier) {
//# sourceMappingURL=UpdateMemberTier.js.map
```

## build/src/api/Member/services/OnboardMember.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const denominations_1 = require("../../../constants/denominations");
const errorUtils_1 = require("../../../utils/errorUtils");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function OnboardMemberService(firstname, lastname, phone) {
        // Validation: Check defaultDenom in denominations
        // Type guard to narrow the type of error
//# sourceMappingURL=OnboardMember.js.map
```

## build/src/api/Member/services/LoginMember.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const authenticate_1 = require("../../../../config/authenticate");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function LoginMemberService(phone) {
        // Update the token in the database
//# sourceMappingURL=LoginMember.js.map
```

## build/src/api/Member/services/AuthForTierSpendLimit.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const denomUtils_1 = require("../../../utils/denomUtils");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function AuthForTierSpendLimitService(issuerAccountID, amount, denom) {
        // If memberTier > 2, return true immediately as "result"
        // If memberTier <= 2, proceed with the larger search query and return calculated values in an object as "result"
//# sourceMappingURL=AuthForTierSpendLimit.js.map
```

## build/src/api/Member/controllers/getMemberByHandle.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const GetMemberByHandle_1 = require("../services/GetMemberByHandle");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
const GetMemberByHandleController = async (req, res, next) => {
//# sourceMappingURL=getMemberByHandle.js.map
```

## build/src/api/Member/controllers/getMemberDashboardByPhone.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const GetMemberDashboardByPhone_1 = require("../services/GetMemberDashboardByPhone");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function GetMemberDashboardByPhoneController(req, res, next) {
/**
 * Controller for retrieving a member's dashboard by phone number
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
//# sourceMappingURL=getMemberDashboardByPhone.js.map
```

## build/src/api/Member/controllers/updateMemberTier.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const UpdateMemberTier_1 = require("../services/UpdateMemberTier");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function UpdateMemberTierController(memberID, tier, requestId) {
async function updateMemberTierExpressHandler(req, res, next) {
/**
 * Controller for updating a member's tier
 * @param memberID - ID of the member
 * @param tier - New tier for the member
 * @param requestId - Unique identifier for the request
 * @returns Object containing success status and message
 */
/**
 * Express middleware wrapper for updating a member's tier
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
//# sourceMappingURL=updateMemberTier.js.map
```

## build/src/api/Member/controllers/onboardMember.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const OnboardMember_1 = require("../services/OnboardMember");
const GetMemberDashboardByPhone_1 = require("../services/GetMemberDashboardByPhone");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
const authenticate_1 = require("../../../../config/authenticate");
const neo4j_1 = require("../../../../config/neo4j");
async function OnboardMemberController(firstname, lastname, phone, requestId) {
async function onboardMemberExpressHandler(req, res, next) {
        // Generate token
        // Save token to Neo4j
//# sourceMappingURL=onboardMember.js.map
```

## build/src/api/Member/controllers/loginMember.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const LoginMember_1 = require("../services/LoginMember");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function LoginMemberController(phone, requestId) {
async function loginMemberExpressHandler(req, res, next) {
//# sourceMappingURL=loginMember.js.map
```

## build/src/api/Member/controllers/authForTierSpendLimit.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const AuthForTierSpendLimit_1 = require("../services/AuthForTierSpendLimit");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function AuthForTierSpendLimitController(memberID, tier, Amount, Denomination, requestId) {
async function authForTierSpendLimitExpressHandler(req, res, next) {
/**
 * Controller for authorizing secured credex for a member's tier
 * @param memberID - ID of the member
 * @param tier - Member's tier
 * @param Amount - Amount for authorization
 * @param Denomination - Denomination for authorization
 * @param requestId - Unique identifier for the request
 * @returns Object containing authorization status and message
 */
/**
 * Express middleware wrapper for secured credex authorization
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
//# sourceMappingURL=authForTierSpendLimit.js.map
```

## build/src/api/Member/memberValidationSchemas.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const validateRequest_1 = require("../../middleware/validateRequest");
const logger_1 = __importDefault(require("../../../config/logger"));
/**
 * Member Validation Schemas
 *
 * This file contains validation schemas for various Member-related operations.
 * These schemas are used by the validateRequest middleware to ensure that
 * incoming requests have the correct structure and data types before they
 * reach the controllers.
 *
 * While this file doesn't contain direct logging statements, it plays a crucial
 * role in the application's error handling and logging process:
 *
 * 1. It helps prevent invalid data from reaching the controllers, reducing the
 *    need for error logging due to data validation issues.
 * 2. When used with the validateRequest middleware, it ensures that any validation
 *    errors are logged consistently across the application.
 * 3. By centralizing validation logic, it makes it easier to update and maintain
 *    data validation rules, which in turn affects what gets logged as errors.
 */
//# sourceMappingURL=memberValidationSchemas.js.map
```

## build/src/api/Member/memberRoutes.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const express_1 = __importDefault(require("express"));
const getMemberByHandle_1 = require("./controllers/getMemberByHandle");
const getMemberDashboardByPhone_1 = require("./controllers/getMemberDashboardByPhone");
const updateMemberTier_1 = require("./controllers/updateMemberTier");
const onboardMember_1 = require("./controllers/onboardMember");
const loginMember_1 = require("./controllers/loginMember");
const authForTierSpendLimit_1 = require("./controllers/authForTierSpendLimit");
const validateRequest_1 = require("../../middleware/validateRequest");
const memberValidationSchemas_1 = require("./memberValidationSchemas");
const logger_1 = __importDefault(require("../../../config/logger"));
const authenticate_1 = require("../../../config/authenticate");
const router = express_1.default.Router();
/**
 * @openapi
 * /member/login:
 *   post:
 *     tags:
 *       - Member
 *     summary: Login a member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 */
/**
 * @openapi
 * /member/getMemberByHandle:
 *   post:
 *     tags:
 *       - Member
 *     summary: Get member by handle
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberHandle
 *             properties:
 *               memberHandle:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
/**
 * @openapi
 * /member/getMemberDashboardByPhone:
 *   post:
 *     tags:
 *       - Member
 *     summary: Get member dashboard by phone
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
/**
 * @openapi
 * /member/onboardMember:
 *   post:
 *     tags:
 *       - Member
 *     summary: Onboard a new member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - lastname
 *               - phone
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 */
/**
 * @openapi
 * /member/updateMemberTier:
 *   post:
 *     tags:
 *       - Member
 *     summary: Update member tier
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberID
 *               - tier
 *             properties:
 *               memberID:
 *                 type: string
 *               tier:
 *                 type: number
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
/**
 * @openapi
 * /member/authForTierSpendLimit:
 *   post:
 *     tags:
 *       - Member
 *     summary: Authorize secured credex for member's tier
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberID
 *               - tier
 *               - Amount
 *               - Denomination
 *             properties:
 *               memberID:
 *                 type: string
 *               tier:
 *                 type: number
 *               Amount:
 *                 type: number
 *               Denomination:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
//# sourceMappingURL=memberRoutes.js.map
```

## build/src/api/Account/services/GetBalances.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const denomUtils_1 = require("../../../utils/denomUtils");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function GetBalancesService(accountID) {
      // Get all unique denominations from Credex nodes related to the account
      // Aggregate incoming secured amounts for each denomination ensuring uniqueness
      // Aggregate outgoing secured amounts for each denomination ensuring uniqueness
      // Calculate the total outgoing amount
      // Get the current day node which should have active status
      // Calculate the net secured balance for each denomination and return the result
//# sourceMappingURL=GetBalances.js.map
```

## build/src/api/Account/services/GetAccountDashboard.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const GetBalances_1 = require("./GetBalances");
const GetPendingOffersIn_1 = require("../../Credex/services/GetPendingOffersIn");
const GetPendingOffersOut_1 = require("../../Credex/services/GetPendingOffersOut");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function GetAccountDashboardService(memberID, accountID) {
//# sourceMappingURL=GetAccountDashboard.js.map
```

## build/src/api/Account/services/CreateAccount.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const errorUtils_1 = require("../../../utils/errorUtils");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function CreateAccountService(ownerID, accountType, accountName, accountHandle, defaultDenom, DCOgiveInCXX = null, DCOdenom = null) {
        //check that account creation is permitted on membership tier
//# sourceMappingURL=CreateAccount.js.map
```

## build/src/api/Account/services/GetAccountByHandle.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function GetAccountByHandleService(accountHandle) {
//# sourceMappingURL=GetAccountByHandle.js.map
```

## build/src/api/Account/services/UpdateAccount.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const denominations_1 = require("../../../constants/denominations");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function UpdateAccountService(ownerID, accountID, accountName, accountHandle, defaultDenom) {
    // Validation: Check defaultDenom in denominations
//# sourceMappingURL=UpdateAccount.js.map
```

## build/src/api/Account/services/AuthorizeForAccount.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function AuthorizeForAccountService(memberHandleToBeAuthorized, accountID, ownerID) {
        // Check that account authorization is permitted on membership tier
//# sourceMappingURL=AuthorizeForAccount.js.map
```

## build/src/api/Account/services/UnauthorizeForAccount.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function UnauthorizeForCompanyService(memberIDtoBeUnauthorized, accountID, ownerID) {
//# sourceMappingURL=UnauthorizeForAccount.js.map
```

## build/src/api/Account/services/UpdateSendOffersTo.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function UpdateSendOffersToService(memberIDtoSendOffers, accountID, ownerID) {
//# sourceMappingURL=UpdateSendOffersTo.js.map
```

## build/src/api/Account/controllers/createAccount.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const CreateAccount_1 = require("../services/CreateAccount");
const accountTypes_1 = require("../../../constants/accountTypes");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function CreateAccountController(req, res, next) {
        // Validate input
//# sourceMappingURL=createAccount.js.map
```

## build/src/api/Account/controllers/getAccountByHandle.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const GetAccountByHandle_1 = require("../services/GetAccountByHandle");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function GetAccountByHandleController(req, res, next) {
/**
 * Controller for retrieving an account by its handle
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
//# sourceMappingURL=getAccountByHandle.js.map
```

## build/src/api/Account/controllers/updateAccount.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const UpdateAccount_1 = require("../services/UpdateAccount");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function UpdateAccountController(req, res, next) {
        // Validate input
//# sourceMappingURL=updateAccount.js.map
```

## build/src/api/Account/controllers/authorizeForAccount.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const AuthorizeForAccount_1 = require("../services/AuthorizeForAccount");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function AuthorizeForAccountController(req, res, next) {
        // Validate input
//# sourceMappingURL=authorizeForAccount.js.map
```

## build/src/api/Account/controllers/unauthorizeForAccount.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const UnauthorizeForAccount_1 = require("../services/UnauthorizeForAccount");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function UnauthorizeForAccountController(req, res, next) {
/**
 * Controller for unauthorizing a member for an account
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
        // Validate memberIDtoBeUnauthorized
        // Validate accountID
        // Validate ownerID
//# sourceMappingURL=unauthorizeForAccount.js.map
```

## build/src/api/Account/controllers/updateSendOffersTo.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const UpdateSendOffersTo_1 = require("../services/UpdateSendOffersTo");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function UpdateSendOffersToController(req, res, next) {
        // Validate input
//# sourceMappingURL=updateSendOffersTo.js.map
```

## build/src/api/Account/controllers/getAccountDashboard.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const GetAccountDashboard_1 = require("../services/GetAccountDashboard");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function GetAccountDashboardController(req, res, next) {
//# sourceMappingURL=getAccountDashboard.js.map
```

## build/src/api/Account/accountValidationSchemas.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const validateRequest_1 = require("../../middleware/validateRequest");
const logger_1 = __importDefault(require("../../../config/logger"));
//# sourceMappingURL=accountValidationSchemas.js.map
```

## build/src/api/Account/accountRoutes.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const index_1 = require("../../index");
const createAccount_1 = require("./controllers/createAccount");
const getAccountByHandle_1 = require("./controllers/getAccountByHandle");
const updateAccount_1 = require("./controllers/updateAccount");
const authorizeForAccount_1 = require("./controllers/authorizeForAccount");
const unauthorizeForAccount_1 = require("./controllers/unauthorizeForAccount");
const updateSendOffersTo_1 = require("./controllers/updateSendOffersTo");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const errorHandler_1 = require("../../middleware/errorHandler");
const validateRequest_1 = require("../../middleware/validateRequest");
const accountValidationSchemas_1 = require("./accountValidationSchemas");
const logger_1 = __importDefault(require("../../../config/logger"));
function AccountRoutes(app, jsonParser) {
    /**
     * @swagger
     * /api/v1/createAccount:
     *   post:
     *     summary: Create a new account
     *     tags: [Accounts]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateAccountRequest'
     *     responses:
     *       200:
     *         description: Account created successfully
     *       400:
     *         description: Bad request
     *       429:
     *         description: Too many requests
     */
    /**
     * @swagger
     * /api/v1/getAccountByHandle:
     *   get:
     *     summary: Get account by handle
     *     tags: [Accounts]
     *     parameters:
     *       - in: query
     *         name: accountHandle
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Account retrieved successfully
     *       400:
     *         description: Bad request
     *       404:
     *         description: Account not found
     *       429:
     *         description: Too many requests
     */
    /**
     * @swagger
     * /api/v1/updateAccount:
     *   patch:
     *     summary: Update account information
     *     tags: [Accounts]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateAccountRequest'
     *     responses:
     *       200:
     *         description: Account updated successfully
     *       400:
     *         description: Bad request
     *       404:
     *         description: Account not found
     *       429:
     *         description: Too many requests
     */
    /**
     * @swagger
     * /api/v1/authorizeForAccount:
     *   post:
     *     summary: Authorize a member for an account
     *     tags: [Accounts]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/AuthorizeForAccountRequest'
     *     responses:
     *       200:
     *         description: Member authorized successfully
     *       400:
     *         description: Bad request
     *       429:
     *         description: Too many requests
     */
    /**
     * @swagger
     * /api/v1/unauthorizeForAccount:
     *   post:
     *     summary: Unauthorize a member for an account
     *     tags: [Accounts]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UnauthorizeForAccountRequest'
     *     responses:
     *       200:
     *         description: Member unauthorized successfully
     *       400:
     *         description: Bad request
     *       429:
     *         description: Too many requests
     */
    /**
     * @swagger
     * /api/v1/updateSendOffersTo:
     *   post:
     *     summary: Update the member to receive offers for an account
     *     tags: [Accounts]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateSendOffersToRequest'
     *     responses:
     *       200:
     *         description: Send offers recipient updated successfully
     *       400:
     *         description: Bad request
     *       429:
     *         description: Too many requests
     */
//# sourceMappingURL=accountRoutes.js.map
```

## build/src/api/Credex/services/GetPendingOffersIn.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const denomUtils_1 = require("../../../utils/denomUtils");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const logger_1 = require("../../../utils/logger");
async function GetPendingOffersInService(accountID) {
//# sourceMappingURL=GetPendingOffersIn.js.map
```

## build/src/api/Credex/services/GetPendingOffersOut.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const denomUtils_1 = require("../../../utils/denomUtils");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const logger_1 = require("../../../utils/logger");
async function GetPendingOffersOutService(accountID) {
//# sourceMappingURL=GetPendingOffersOut.js.map
```

## build/src/api/Credex/services/GetSecuredAuthorization.js
```
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = require("../../../utils/logger");
async function GetSecuredAuthorizationService(issuerAccountID, Denomination) {
/*
*/
        // Check if issuer is CREDEX_FOUNDATION_AUDITED
        // If the issuer is CREDEX_FOUNDATION_AUDITED, authorize for unlimited secured credex issuance
        // If issuer is not CREDEX_FOUNDATION_AUDITED, verify the available secured balance in denom
//# sourceMappingURL=GetSecuredAuthorization.js.map
```

## build/src/api/Credex/services/CreateCredex.js
```
const neo4j_1 = require("../../../../config/neo4j");
const denomUtils_1 = require("../../../utils/denomUtils");
const GetSecuredAuthorization_1 = require("./GetSecuredAuthorization");
const logger_1 = require("../../../utils/logger");
async function CreateCredexService(credexData) {
        // Get securable data for secured credex
        // Create the credex
        // Add dueDate for unsecured credex
        // Add secured relationships for secured credex
//# sourceMappingURL=CreateCredex.js.map
```

## build/src/api/Credex/services/OfferCredex.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const CreateCredex_1 = require("./CreateCredex");
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = __importDefault(require("../../../../config/logger"));
const digitalSignature_1 = require("../../../utils/digitalSignature");
async function OfferCredexService(credexData) {
/**
 * OfferCredexService
 *
 * This service handles the creation of a new Credex offer.
 * It uses the CreateCredexService to create the Credex and then
 * signs the offer and prepares it for notification.
 *
 * @param credexData - An object containing the data for the new Credex
 * @returns The result of the Credex offer creation
 */
        // Set default values for the Credex
        // Create the new Credex
        // Sign the Credex using the new digital signature utility
        // TODO: Implement offer notification here
//# sourceMappingURL=OfferCredex.js.map
```

## build/src/api/Credex/services/AcceptCredex.js
```
const neo4j_1 = require("../../../../config/neo4j");
const digitalSignature_1 = require("../../../utils/digitalSignature");
const logger_1 = require("../../../utils/logger");
async function AcceptCredexService(credexID, signerID, requestId) {
/**
 * AcceptCredexService
 *
 * This service handles the acceptance of a Credex offer.
 * It updates the Credex status from OFFERS to OWES and signs the acceptance.
 *
 * @param credexID - The ID of the Credex to be accepted
 * @param signerID - The ID of the Member or Avatar signing the acceptance
 * @param requestId - The ID of the HTTP request that initiated this operation
 * @returns An object with the accepted Credex details or null if the operation fails
 * @throws Error if there's an issue with the database operation
 */
            // Create digital signature
            // TODO: Implement credex accepted notification here
//# sourceMappingURL=AcceptCredex.js.map
```

## build/src/api/Credex/services/DeclineCredex.js
```
const neo4j_1 = require("../../../../config/neo4j");
const digitalSignature_1 = require("../../../utils/digitalSignature");
const logger_1 = require("../../../utils/logger");
async function DeclineCredexService(credexID, signerID, requestId) {
        // Create digital signature
//# sourceMappingURL=DeclineCredex.js.map
```

## build/src/api/Credex/services/CancelCredex.js
```
const neo4j_1 = require("../../../../config/neo4j");
const digitalSignature_1 = require("../../../utils/digitalSignature");
const logger_1 = require("../../../utils/logger");
async function CancelCredexService(credexID, signerID, requestId) {
/**
 * CancelCredexService
 *
 * This service handles the cancellation of a Credex offer or request.
 * It changes the relationships from OFFERS or REQUESTS to CANCELLED.
 *
 * @param credexID - The ID of the Credex to be cancelled
 * @param signerID - The ID of the member or avatar cancelling the Credex
 * @param requestId - The ID of the HTTP request that initiated this operation
 * @returns The ID of the cancelled Credex or null if the operation fails
 * @throws Error if there's an issue with the database operation
 */
            // Create digital signature with audit log
//# sourceMappingURL=CancelCredex.js.map
```

## build/src/api/Credex/services/GetCredex.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const denomUtils_1 = require("../../../utils/denomUtils");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const logger_1 = require("../../../utils/logger");
async function GetCredexService(credexID, accountID) {
//# sourceMappingURL=GetCredex.js.map
```

## build/src/api/Credex/services/GetLedger.js
```
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
var __importStar = (this && this.__importStar) || function (mod) {
const neo4j = __importStar(require("neo4j-driver"));
const neo4j_1 = require("../../../../config/neo4j");
const denomUtils_1 = require("../../../utils/denomUtils");
const logger_1 = require("../../../utils/logger");
async function GetLedgerService(accountID, numRows = 10, startRow = 0) {
//# sourceMappingURL=GetLedger.js.map
```

## build/src/api/Credex/controllers/offerCredex.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const OfferCredex_1 = require("../services/OfferCredex");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const credspan_1 = require("../../../constants/credspan");
const authForTierSpendLimit_1 = require("../../Member/controllers/authForTierSpendLimit");
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function OfferCredexController(req, res) {
/**
 * OfferCredexController
 *
 * This controller handles the creation of new Credex offers.
 * It validates the required fields, performs additional validations,
 * calls the OfferCredexService, and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
        // Validate input
        // Check if issuerAccountID and receiverAccountID are the same
        // Check due date for unsecured credex
        // Check secured credex limits based on membership tier
        // Check if unsecured credex is permitted on membership tier
        // Call OfferCredexService to create the Credex offer
        // Fetch updated dashboard data
        // Log successful Credex offer
        // Return the offer data and updated dashboard data
//# sourceMappingURL=offerCredex.js.map
```

## build/src/api/Credex/controllers/acceptCredex.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const AcceptCredex_1 = require("../services/AcceptCredex");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function AcceptCredexController(req, res) {
/**
 * AcceptCredexController
 *
 * This controller handles the acceptance of Credex offers.
 * It validates the required fields, calls the AcceptCredexService,
 * and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
//# sourceMappingURL=acceptCredex.js.map
```

## build/src/api/Credex/controllers/acceptCredexBulk.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const AcceptCredex_1 = require("../services/AcceptCredex");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const validators_1 = require("../../../utils/validators");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function AcceptCredexBulkController(req, res) {
/**
 * AcceptCredexBulkController
 *
 * This controller handles the bulk acceptance of multiple Credex offers.
 * It validates the required fields, calls the AcceptCredexService for each Credex,
 * fetches updated dashboard data, and returns the result.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
        // Filter out any null values
            // Assuming that memberID and acceptorAccountID are the same for all returned objects
            // Handle the case when there are no valid data returned from AcceptCredexService
//# sourceMappingURL=acceptCredexBulk.js.map
```

## build/src/api/Credex/controllers/declineCredex.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const DeclineCredex_1 = require("../services/DeclineCredex");
const validators_1 = require("../../../utils/validators");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function DeclineCredexController(req, res) {
/**
 * DeclineCredexController
 *
 * This controller handles the declining of Credex offers.
 * It validates the required fields, calls the DeclineCredexService,
 * and returns the result.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
//# sourceMappingURL=declineCredex.js.map
```

## build/src/api/Credex/controllers/cancelCredex.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const CancelCredex_1 = require("../services/CancelCredex");
const validators_1 = require("../../../utils/validators");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function CancelCredexController(req, res) {
/**
 * CancelCredexController
 *
 * This controller handles the cancellation of Credex offers.
 * It validates the required fields, calls the CancelCredexService,
 * and returns the result.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
//# sourceMappingURL=cancelCredex.js.map
```

## build/src/api/Credex/controllers/getCredex.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const GetCredex_1 = require("../services/GetCredex");
const validators_1 = require("../../../utils/validators");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function GetCredexController(req, res) {
/**
 * GetCredexController
 *
 * This controller handles retrieving Credex details.
 * It validates the required fields, calls the GetCredexService,
 * and returns the result.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
//# sourceMappingURL=getCredex.js.map
```

## build/src/api/Credex/controllers/getLedger.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const GetLedger_1 = require("../services/GetLedger");
const validators_1 = require("../../../utils/validators");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function GetLedgerController(req, res) {
/**
 * GetLedgerController
 *
 * This controller handles retrieving the ledger for an account.
 * It validates the required fields, calls the GetLedgerService,
 * and returns the result.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
//# sourceMappingURL=getLedger.js.map
```

## build/src/api/Credex/credexValidationSchemas.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const validateRequest_1 = require("../../middleware/validateRequest");
const logger_1 = __importDefault(require("../../../config/logger"));
// Add more schemas as needed for other Credex operations
//# sourceMappingURL=credexValidationSchemas.js.map
```

## build/src/api/Credex/credexRoutes.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const index_1 = require("../../index");
const offerCredex_1 = require("./controllers/offerCredex");
const acceptCredex_1 = require("./controllers/acceptCredex");
const acceptCredexBulk_1 = require("./controllers/acceptCredexBulk");
const declineCredex_1 = require("./controllers/declineCredex");
const cancelCredex_1 = require("./controllers/cancelCredex");
const getCredex_1 = require("./controllers/getCredex");
const getLedger_1 = require("./controllers/getLedger");
const validateRequest_1 = require("../../middleware/validateRequest");
const credexValidationSchemas_1 = require("./credexValidationSchemas");
const logger_1 = __importDefault(require("../../../config/logger"));
function CredexRoutes(app, jsonParser) {
    /**
     * @swagger
     * /api/v1/offerCredex:
     *   post:
     *     summary: Offer a new Credex
     *     tags: [Credex]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - memberID
     *               - issuerAccountID
     *               - receiverAccountID
     *               - Denomination
     *               - InitialAmount
     *             properties:
     *               memberID:
     *                 type: string
     *               issuerAccountID:
     *                 type: string
     *               receiverAccountID:
     *                 type: string
     *               Denomination:
     *                 type: string
     *               InitialAmount:
     *                 type: number
     *               credexType:
     *                 type: string
     *               securedCredex:
     *                 type: boolean
     *               dueDate:
     *                 type: string
     *                 format: date
     *     responses:
     *       200:
     *         description: Credex offered successfully
     *       400:
     *         description: Bad request
     */
    /**
     * @swagger
     * /api/v1/acceptCredex:
     *   put:
     *     summary: Accept a Credex offer
     *     tags: [Credex]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - credexID
     *               - signerID
     *             properties:
     *               credexID:
     *                 type: string
     *               signerID:
     *                 type: string
     *     responses:
     *       200:
     *         description: Credex accepted successfully
     *       400:
     *         description: Bad request
     */
    /**
     * @swagger
     * /api/v1/acceptCredexBulk:
     *   put:
     *     summary: Accept multiple Credex offers in bulk
     *     tags: [Credex]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - credexIDs
     *               - signerID
     *             properties:
     *               credexIDs:
     *                 type: array
     *                 items:
     *                   type: string
     *               signerID:
     *                 type: string
     *     responses:
     *       200:
     *         description: Credexes accepted successfully
     *       400:
     *         description: Bad request
     */
    /**
     * @swagger
     * /api/v1/declineCredex:
     *   put:
     *     summary: Decline a Credex offer
     *     tags: [Credex]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - credexID
     *             properties:
     *               credexID:
     *                 type: string
     *     responses:
     *       200:
     *         description: Credex declined successfully
     *       400:
     *         description: Bad request
     */
    /**
     * @swagger
     * /api/v1/cancelCredex:
     *   put:
     *     summary: Cancel a Credex offer
     *     tags: [Credex]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - credexID
     *             properties:
     *               credexID:
     *                 type: string
     *     responses:
     *       200:
     *         description: Credex cancelled successfully
     *       400:
     *         description: Bad request
     */
    /**
     * @swagger
     * /api/v1/getCredex:
     *   get:
     *     summary: Get Credex details
     *     tags: [Credex]
     *     parameters:
     *       - in: query
     *         name: credexID
     *         required: true
     *         schema:
     *           type: string
     *       - in: query
     *         name: accountID
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Credex details retrieved successfully
     *       400:
     *         description: Bad request
     *       404:
     *         description: Credex not found
     */
    /**
     * @swagger
     * /api/v1/getLedger:
     *   get:
     *     summary: Get account ledger
     *     tags: [Credex]
     *     parameters:
     *       - in: query
     *         name: accountID
     *         required: true
     *         schema:
     *           type: string
     *       - in: query
     *         name: numRows
     *         schema:
     *           type: integer
     *       - in: query
     *         name: startRow
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Ledger retrieved successfully
     *       400:
     *         description: Bad request
     */
//# sourceMappingURL=credexRoutes.js.map
```

## build/src/api/Avatar/services/RequestRecurring.js
```
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
var __importStar = (this && this.__importStar) || function (mod) {
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const neo4j = __importStar(require("neo4j-driver"));
const digitalSignature_1 = require("../../../utils/digitalSignature");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function RequestRecurringService(params) {
//# sourceMappingURL=RequestRecurring.js.map
```

## build/src/api/Avatar/services/AcceptRecurring.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const digitalSignature_1 = require("../../../utils/digitalSignature");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function AcceptRecurringService(params) {
/**
 * AcceptRecurringService
 *
 * This service handles the acceptance of a recurring transaction.
 * It updates the database to reflect the acceptance of the recurring avatar.
 *
 * @param params - An object containing avatarID, signerID, and requestId
 * @returns An object containing the result of the acceptance operation
 */
        // TODO: Implement notification for recurring acceptance
//# sourceMappingURL=AcceptRecurring.js.map
```

## build/src/api/Avatar/services/CancelRecurring.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const digitalSignature_1 = require("../../../utils/digitalSignature");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function CancelRecurringService(signerID, cancelerAccountID, avatarID, requestId) {
//# sourceMappingURL=CancelRecurring.js.map
```

## build/src/api/Avatar/controllers/requestRecurring.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const RequestRecurring_1 = require("../services/RequestRecurring");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function RequestRecurringController(req, res) {
/**
 * RequestRecurringController
 *
 * This controller handles the creation of recurring payment requests.
 * It validates the input, calls the RequestRecurringService,
 * and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
//# sourceMappingURL=requestRecurring.js.map
```

## build/src/api/Avatar/controllers/acceptRecurring.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const AcceptRecurring_1 = require("../services/AcceptRecurring");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function AcceptRecurringController(req, res) {
/**
 * AcceptRecurringController
 *
 * This controller handles the acceptance of recurring transactions.
 * It validates the required fields, calls the AcceptRecurringService,
 * and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
        // Call AcceptRecurringService to process the acceptance
        // Check if the service call was successful
        // Fetch dashboard data
        // Return the acceptance data and dashboard data
//# sourceMappingURL=acceptRecurring.js.map
```

## build/src/api/Avatar/controllers/cancelRecurring.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const CancelRecurring_1 = require("../services/CancelRecurring");
const GetAccountDashboard_1 = require("../../Account/services/GetAccountDashboard");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function DeclineRecurringController(req, res) {
//# sourceMappingURL=cancelRecurring.js.map
```

## build/src/api/Avatar/avatarValidationSchemas.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const validateRequest_1 = require("../../middleware/validateRequest");
const logger_1 = __importDefault(require("../../../config/logger"));
// Add more schemas as needed for other Avatar operations
//# sourceMappingURL=avatarValidationSchemas.js.map
```

## build/src/api/Avatar/recurringRoutes.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const index_1 = require("../../index");
const requestRecurring_1 = require("./controllers/requestRecurring");
const acceptRecurring_1 = require("./controllers/acceptRecurring");
const cancelRecurring_1 = require("./controllers/cancelRecurring");
const errorHandler_1 = require("../../middleware/errorHandler");
const validateRequest_1 = require("../../middleware/validateRequest");
const avatarValidationSchemas_1 = require("./avatarValidationSchemas");
const logger_1 = __importDefault(require("../../utils/logger"));
function RecurringRoutes(app, jsonParser) {
    /**
     * @swagger
     * /api/v1/requestRecurring:
     *   post:
     *     summary: Request a recurring payment
     *     tags: [Recurring]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/RequestRecurring'
     *     responses:
     *       200:
     *         description: Recurring payment requested successfully
     *       400:
     *         description: Bad request
     */
    /**
     * @swagger
     * /api/v1/acceptRecurring:
     *   put:
     *     summary: Accept a recurring payment request
     *     tags: [Recurring]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/AcceptRecurring'
     *     responses:
     *       200:
     *         description: Recurring payment accepted successfully
     *       400:
     *         description: Bad request
     */
    /**
     * @swagger
     * /api/v1/cancelRecurring:
     *   delete:
     *     summary: Cancel a recurring payment
     *     tags: [Recurring]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CancelRecurring'
     *     responses:
     *       200:
     *         description: Recurring payment cancelled successfully
     *       400:
     *         description: Bad request
     */
/**
 * @swagger
 * components:
 *   schemas:
 *     RequestRecurring:
 *       type: object
 *       required:
 *         - signerMemberID
 *         - requestorAccountID
 *         - counterpartyAccountID
 *         - InitialAmount
 *         - Denomination
 *         - nextPayDate
 *         - daysBetweenPays
 *       properties:
 *         signerMemberID:
 *           type: string
 *           format: uuid
 *         requestorAccountID:
 *           type: string
 *           format: uuid
 *         counterpartyAccountID:
 *           type: string
 *           format: uuid
 *         InitialAmount:
 *           type: number
 *         Denomination:
 *           type: string
 *         nextPayDate:
 *           type: string
 *           format: date
 *         daysBetweenPays:
 *           type: integer
 *         securedCredex:
 *           type: boolean
 *         credspan:
 *           type: integer
 *           minimum: 7
 *           maximum: 35
 *         remainingPays:
 *           type: integer
 *           minimum: 0
 *     AcceptRecurring:
 *       type: object
 *       required:
 *         - avatarID
 *         - signerID
 *       properties:
 *         avatarID:
 *           type: string
 *           format: uuid
 *         signerID:
 *           type: string
 *           format: uuid
 *     CancelRecurring:
 *       type: object
 *       required:
 *         - signerID
 *         - cancelerAccountID
 *         - avatarID
 *       properties:
 *         signerID:
 *           type: string
 *           format: uuid
 *         cancelerAccountID:
 *           type: string
 *           format: uuid
 *         avatarID:
 *           type: string
 *           format: uuid
 */
//# sourceMappingURL=recurringRoutes.js.map
```

## build/src/api/AdminDashboard/services/GetCredexService.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = __importDefault(require("../../../utils/logger"));
async function GetCredexService(credexID) {
//# sourceMappingURL=GetCredexService.js.map
```

## build/src/api/AdminDashboard/services/GetMemberService.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = __importDefault(require("../../../utils/logger"));
async function GetMemberService(memberHandle) {
//# sourceMappingURL=GetMemberService.js.map
```

## build/src/api/AdminDashboard/services/UpdateMemberTierService.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = __importDefault(require("../../../utils/logger"));
const validators_1 = require("../../../utils/validators");
async function UpdateMemberTierService(memberHandle, newTier) {
    // Validate newTier
//# sourceMappingURL=UpdateMemberTierService.js.map
```

## build/src/api/AdminDashboard/services/GetAccountService.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = __importDefault(require("../../../utils/logger"));
async function GetAccount(accountHandle, accountID) {
//# sourceMappingURL=GetAccountService.js.map
```

## build/src/api/AdminDashboard/services/GetAccountReceivedCredexOffers.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = __importDefault(require("../../../utils/logger"));
async function GetAccountReceivedCredexOffers(accountHandle, accountID) {
//# sourceMappingURL=GetAccountReceivedCredexOffers.js.map
```

## build/src/api/AdminDashboard/services/GetAccountSentCredexOffers.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = __importDefault(require("../../../utils/logger"));
async function GetAccountSentCredexOffers(accountHandle, accountID) {
//# sourceMappingURL=GetAccountSentCredexOffers.js.map
```

## build/src/api/AdminDashboard/services/GetMemberAccountsOwnerByMemberSevice.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = __importDefault(require("../../../../config/logger"));
async function GetMemberAccountsOwnerByMemberService(memberID) {
//# sourceMappingURL=GetMemberAccountsOwnerByMemberSevice.js.map
```

## build/src/api/AdminDashboard/controllers/CredexController.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const GetCredexService_1 = __importDefault(require("../services/GetCredexService"));
const logger_1 = __importDefault(require("../../../utils/logger"));
const errorUtils_1 = require("../../../utils/errorUtils");
const validators_1 = require("../../../utils/validators");
async function getCredexDetails(req, res, next) {
export async function updateCredexStatus(req: Request, res: Response, next: NextFunction) {
// Additional controller functions can be added here in the future
// Example:
/*
  // Add validation for newStatus when implemented
*/ 
//# sourceMappingURL=CredexController.js.map
```

## build/src/api/AdminDashboard/controllers/MemberController.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const GetMemberService_1 = __importDefault(require("../services/GetMemberService"));
const UpdateMemberTierService_1 = __importDefault(require("../services/UpdateMemberTierService"));
const logger_1 = __importDefault(require("../../../utils/logger"));
const errorUtils_1 = require("../../../utils/errorUtils");
const validators_1 = require("../../../utils/validators");
async function getMemberDetails(req, res, next) {
async function updateMemberTier(req, res, next) {
export async function updateMemberStatus(req: Request, res: Response, next: NextFunction) {
export async function logMemberInteraction(req: Request, res: Response, next: NextFunction) {
// Keep the commented out functions for future reference
/*
  // Add validation for newStatus when implemented
  // Add validation for interactionType and interactionDetails when implemented
*/
//# sourceMappingURL=MemberController.js.map
```

## build/src/api/AdminDashboard/controllers/AccountController.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const GetAccountService_1 = __importDefault(require("../services/GetAccountService"));
const GetAccountReceivedCredexOffers_1 = __importDefault(require("../services/GetAccountReceivedCredexOffers"));
const GetAccountSentCredexOffers_1 = __importDefault(require("../services/GetAccountSentCredexOffers"));
const logger_1 = __importDefault(require("../../../utils/logger"));
const errorUtils_1 = require("../../../utils/errorUtils");
const validators_1 = require("../../../utils/validators");
async function getAccountDetails(req, res, next) {
async function getReceivedCredexOffers(req, res, next) {
async function getSentCredexOffers(req, res, next) {
//# sourceMappingURL=AccountController.js.map
```

## build/src/api/AdminDashboard/adminDashboardValidationSchemas.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const validateRequest_1 = require("../../middleware/validateRequest");
const logger_1 = __importDefault(require("../../../config/logger"));
//# sourceMappingURL=adminDashboardValidationSchemas.js.map
```

## build/src/api/AdminDashboard/adminDashboardRoutes.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const index_1 = require("../../index");
const CredexController_1 = require("./controllers/CredexController");
const MemberController_1 = require("./controllers/MemberController");
const AccountController_1 = require("./controllers/AccountController");
const errorHandler_1 = require("../../middleware/errorHandler");
const validateRequest_1 = require("../../middleware/validateRequest");
const adminDashboardValidationSchemas_1 = require("./adminDashboardValidationSchemas");
const logger_1 = __importDefault(require("../../utils/logger"));
function AdminDashboardRoutes(app, jsonParser) {
//# sourceMappingURL=adminDashboardRoutes.js.map
```

## build/src/constants/credexTypes.js
```
function checkPermittedCredexType(credexTypeToCheck) {
//# sourceMappingURL=credexTypes.js.map
```

## build/src/constants/denominations.js
```
const denominations = [
function getDenominations(options) {
const getFullDescription = (code) => {
const isValidDenomination = (code) => {
/**
 * Array of supported denominations in the Credex system.
 */
/**
 * Retrieves denominations based on provided options.
 * @param options - Options for filtering denominations.
 * @returns An array of Denomination objects or a comma-separated string of denomination codes.
 */
/**
 * Retrieves the full description of a denomination by its code.
 * @param code - The denomination code.
 * @returns The full description of the denomination, or undefined if not found.
 */
/**
 * Checks if a given code is a valid denomination.
 * @param code - The denomination code to check.
 * @returns True if the code is a valid denomination, false otherwise.
 */
//# sourceMappingURL=denominations.js.map
```

## build/src/constants/accountTypes.js
```
function checkPermittedAccountType(credexTypeToCheck) {
//# sourceMappingURL=accountTypes.js.map
```

## build/src/constants/credspan.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../config/neo4j");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const logger_1 = __importDefault(require("../../config/logger"));
async function checkDueDate(dueDate) {
//# sourceMappingURL=credspan.js.map
```

## build/src/middleware/validateRequest.js
```
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
var __importStar = (this && this.__importStar) || function (mod) {
var __importDefault = (this && this.__importDefault) || function (mod) {
const validators = __importStar(require("../utils/validators"));
const logger_1 = __importDefault(require("../../config/logger"));
function validateObject(obj, schema) {
function validateRequest(schema, source = 'body') {
//# sourceMappingURL=validateRequest.js.map
```

## build/src/middleware/rateLimiter.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = __importDefault(require("../../config/logger"));
const apiLimiter = (0, express_rate_limit_1.default)({
const rateLimiter = (req, res, next) => {
    // Apply rate limiting to all requests
//# sourceMappingURL=rateLimiter.js.map
```

## build/src/middleware/errorHandler.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const logger_1 = __importDefault(require("../../config/logger"));
const errorHandler = (err, req, res, _next) => {
const notFoundHandler = (req, res, next) => {
//# sourceMappingURL=errorHandler.js.map
```

## build/src/core-cron/DCO/fetchZwgRate.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = __importDefault(require("cheerio"));
const logger_1 = __importDefault(require("../../../config/logger"));
const https = require("https");
const RBZ_URL = "https://www.rbz.co.zw/index.php";
const httpsAgent = new https.Agent({
function isValidRate(rate) {
function validateRates(rates) {
class ZwgRateError extends Error {
async function fetchZwgRate() {
//# sourceMappingURL=fetchZwgRate.js.map
```

## build/src/core-cron/DCO/DBinitialization.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../config/neo4j");
const denominations_1 = require("../../constants/denominations");
const onboardMember_1 = require("../../api/Member/controllers/onboardMember");
const updateMemberTier_1 = require("../../api/Member/controllers/updateMemberTier");
const CreateAccount_1 = require("../../api/Account/services/CreateAccount");
const OfferCredex_1 = require("../../api/Credex/services/OfferCredex");
const AcceptCredex_1 = require("../../api/Credex/services/AcceptCredex");
const fetchZwgRate_1 = require("./fetchZwgRate");
const axios_1 = __importDefault(require("axios"));
const lodash_1 = __importDefault(require("lodash"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const logger_1 = __importDefault(require("../../../config/logger"));
const uuid_1 = require("uuid");
async function DBinitialization() {
async function setupDatabaseConstraints(ledgerSpaceSession, searchSpaceSession, requestId) {
function establishDayZero(requestId) {
async function fetchAndProcessRates(dayZero, requestId) {
async function createDayZeroDaynode(session, dayZero, dayZeroCXXrates, requestId) {
async function createInitialAccounts(session, requestId) {
async function createRdubsAccount(requestId) {
async function createCredexFoundation(memberID, requestId) {
async function createGreatSun(memberID, requestId) {
async function createVimbisoPay(memberID, requestId) {
async function createInitialRelationships(session, credexFoundationID, greatSunID, vimbisoPayID, requestId) {
async function createInitialCredex(memberID, issuerAccountID, receiverAccountID, requestId) {
/**
 * Initializes the database for the Daily Credcoin Offering (DCO) process.
 * This function sets up necessary constraints, creates initial accounts,
 * and establishes the starting state for the DCO.
 */
/**
 * Sets up necessary database constraints and indexes.
 */
    // Remove any current db constraints
    // Set new constraints
/**
 * Establishes the day zero date.
 */
/**
 * Fetches and processes currency rates for day zero.
 */
/**
 * Creates the day zero daynode in the database.
 */
/**
 * Creates initial accounts and relationships for the DCO process.
 */
// ... [rest of the code remains unchanged] ...
//# sourceMappingURL=DBinitialization.js.map
```

## build/src/core-cron/DCO/DBbackup.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../config/neo4j");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../../../config/logger"));
const exportDatabase = async (driver, databaseName, previousDate, append) => {
const createNeo4jBackup = async (previousDate, append) => {
//# sourceMappingURL=DBbackup.js.map
```

## build/src/core-cron/DCO/DCOexecute.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const axios_1 = __importDefault(require("axios"));
const lodash_1 = __importDefault(require("lodash"));
const neo4j_1 = require("../../../config/neo4j");
const denominations_1 = require("../../constants/denominations");
const GetSecuredAuthorization_1 = require("../../api/Credex/services/GetSecuredAuthorization");
const OfferCredex_1 = require("../../api/Credex/services/OfferCredex");
const AcceptCredex_1 = require("../../api/Credex/services/AcceptCredex");
const fetchZwgRate_1 = require("./fetchZwgRate");
const DBbackup_1 = require("./DBbackup");
const logger_1 = require("../../utils/logger");
const validators_1 = require("../../utils/validators");
const uuid_1 = require("uuid");
async function DCOexecute() {
async function waitForMTQCompletion(session) {
async function setDCORunningFlag(session) {
async function resetDCORunningFlag(session) {
async function handleDefaultingCredexes(session) {
async function expirePendingOffers(session) {
async function fetchCurrencyRates(nextDate) {
function validateRates(rates) {
async function processDCOParticipants(session, USDbaseRates) {
async function createNewDaynode(session, newCXXrates, nextDate, CXXprior_CXXcurrent) {
async function updateCredexBalances(ledgerSession, searchSession, newCXXrates, CXXprior_CXXcurrent) {
async function getFoundationData(session) {
async function processDCOTransactions(session, foundationID, foundationXOid, DCOinCXX, numberConfirmedParticipants) {
/**
 * Executes the Daily Credcoin Offering (DCO) process.
 * This function handles the daily operations of the Credcoin system,
 * including rate updates, participant validation, and transaction processing.
 */
    // Update ledger space
    // Update CXX credexes
    // Update currency credexes
    // Update CXX :REDEEMED relationships
    // Update currency :REDEEMED relationships
    // Update CXX :CREDLOOP relationships
    // Update currency :CREDLOOP relationships
    // Update loop anchors (always CXX)
    // Update search space
    // Process DCO give transactions
        // Log the offer creation
        // Log the credex acceptance
    // Process DCO receive transactions
        // Log the offer creation
        // Log the credex acceptance
// ... [rest of the file remains unchanged]
//# sourceMappingURL=DCOexecute.js.map
```

## build/src/core-cron/DCO/DCOavatars.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../config/neo4j");
const OfferCredex_1 = require("../../api/Credex/services/OfferCredex");
const AcceptCredex_1 = require("../../api/Credex/services/AcceptCredex");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const logger_1 = __importDefault(require("../../../config/logger"));
const uuid_1 = require("uuid");
async function DCOavatars() {
async function getActiveRecurringAvatars(session) {
async function processAvatar(session, avatarData) {
function prepareOfferData(avatar, issuerAccountID, acceptorAccountID, date, requestId) {
async function createCredexOffer(offerData) {
async function acceptCredexOffer(credexID, avatarMemberID, requestId) {
async function deleteMarkedAuthorizations(session, requestId, avatarId) {
/**
 * DCOavatars function
 * This function is run as a cronjob every 24 hours to process recurring avatars.
 * It identifies active recurring avatars, creates credexes, and updates their status.
 */
    // Reduce remainingPays by 1 if it exists
    // Calculate the new nextPayDate
    // Update nextPayDate
    // Check if the avatar should be marked as completed
        // TODO: Implement member notification about the failure
//# sourceMappingURL=DCOavatars.js.map
```

## build/src/core-cron/DCO/DailyCredcoinOffering.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../config/neo4j");
const DBinitialization_1 = require("./DBinitialization");
const DCOexecute_1 = require("./DCOexecute");
const DCOavatars_1 = require("./DCOavatars");
const logger_1 = __importDefault(require("../../../config/logger"));
async function DailyCredcoinOffering() {
async function checkActiveDaynode(session) {
async function resetDCORunningFlag(session) {
/**
 * Executes the Daily Credcoin Offering (DCO) process.
 * This function checks for an active daynode, initializes the database if necessary,
 * and runs the DCO execution and avatar update processes.
 *
 * @returns {Promise<{ success: boolean, error?: string }>} Returns an object indicating success and any error message.
 */
        // Check for active daynode
/**
 * Checks if an active daynode exists in the database.
 *
 * @param {Neo4jSession} session - The Neo4j session to use for the query.
 * @returns {Promise<boolean>} Returns true if an active daynode exists, false otherwise.
 */
/**
 * Resets the DCOrunningNow flag on the active daynode.
 *
 * @param {Neo4jSession} session - The Neo4j session to use for the query.
 */
//# sourceMappingURL=DailyCredcoinOffering.js.map
```

## build/src/core-cron/DCO/DCOsnapshots/placeholder.js
```
//placeholder
//# sourceMappingURL=placeholder.js.map
```

## build/src/core-cron/MTQ/LoopFinder.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../config/neo4j");
const logger_1 = __importDefault(require("../../../config/logger"));
async function LoopFinder(issuerAccountID, credexID, credexAmount, Denomination, CXXmultiplier, credexSecuredDenom, credexDueDate, acceptorAccountID) {
function getSearchOwesType(credexSecuredDenom) {
async function adjustCredexDueDate(session, credexSecuredDenom, credexDueDate) {
async function createOrUpdateSearchSpaceCredex(session, issuerAccountID, acceptorAccountID, credexID, credexAmount, Denomination, CXXmultiplier, credexDueDate, searchOwesType) {
async function checkCredexExists(session, credexID) {
async function createSearchSpaceCredex(session, issuerAccountID, acceptorAccountID, credexID, credexAmount, Denomination, CXXmultiplier, credexDueDate, searchOwesType) {
async function findCredloop(session, issuerAccountID, searchOwesType) {
async function processCredloop(ledgerSpaceSession, searchSpaceSession, valueToClear, credexesInLoop, credexesRedeemed) {
async function cleanupSearchSpace(session, credexesRedeemed) {
async function updateLedgerSpace(session, valueToClear, credexesInLoop, credexesRedeemed) {
async function markCredexAsProcessed(session, credexID) {
async function createNotifications(session: neo4j.Session, loopID: string): Promise<void> {
    // Step 1: Find all loops starting and ending at the specified account, with the specified searchOwesType
    // Step 3: Filter loops to include only those containing a node with the earliest earliestDueDate
    // Step 4: Return only the longest loop, breaking ties with rand()
    // Step 5: Each node returns the credex it is connected to with the earliest dueDate
    // on tie, credex with largest amount
    // Step 6: Identify the minimum outstandingAmount and subtract it from all credexes
    // Step 7: Collect all credexes and filter those with outstandingAmount = 0.
    //Step 8: collect credexIDs of the zeroCredexes
    // Step 10: Delete zeroCredexes
    // Step 11: Handle orphaned searchAnchors
    // Step 12: Update earliestDueDate on remaining searchAnchors
// TODO: Implement notification system
/*
  // Implementation for creating notifications
*/
//# sourceMappingURL=LoopFinder.js.map
```

## build/src/core-cron/MTQ/MinuteTransactionQueue.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const neo4j_1 = require("../../../config/neo4j");
const LoopFinder_1 = require("./LoopFinder");
const lodash_1 = __importDefault(require("lodash"));
const logger_1 = __importDefault(require("../../../config/logger"));
async function MinuteTransactionQueue() {
async function checkDCOAndMTQStatus(session) {
async function setMTQRunningFlag(session, value) {
async function processQueuedAccounts(ledgerSpaceSession, searchSpaceSession) {
async function getQueuedAccounts(session) {
async function createAccountInSearchSpace(session, account) {
async function markAccountAsProcessed(session, accountID) {
async function processQueuedCredexes(ledgerSpaceSession, searchSpaceSession) {
async function getQueuedCredexes(session) {
//# sourceMappingURL=MinuteTransactionQueue.js.map
```

## build/src/core-cron/cronJobs.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const node_cron_1 = __importDefault(require("node-cron"));
const DailyCredcoinOffering_1 = require("./DCO/DailyCredcoinOffering");
const MinuteTransactionQueue_1 = require("./MTQ/MinuteTransactionQueue");
const logger_1 = __importDefault(require("../../config/logger"));
function startCronJobs() {
    // Running DailyCredcoinOffering every day at midnight UTC
    // Running MinuteTransactionQueue every minute
//# sourceMappingURL=cronJobs.js.map
```

## build/src/index.js
```
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
var __importStar = (this && this.__importStar) || function (mod) {
var __importDefault = (this && this.__importDefault) || function (mod) {
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const memberRoutes_1 = __importDefault(require("./api/Member/memberRoutes"));
const accountRoutes_1 = __importDefault(require("./api/Account/accountRoutes"));
const credexRoutes_1 = __importDefault(require("./api/Credex/credexRoutes"));
const recurringRoutes_1 = __importDefault(require("./api/Avatar/recurringRoutes"));
const logger_1 = __importStar(require("../config/logger"));
const body_parser_1 = __importDefault(require("body-parser"));
const cronJobs_1 = __importDefault(require("./core-cron/cronJobs"));
const authenticate_1 = require("../config/authenticate");
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const adminDashboardRoutes_1 = __importDefault(require("./api/AdminDashboard/adminDashboardRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("../config/swagger");
const configUtils_1 = __importDefault(require("./utils/configUtils"));
const jsonParser = body_parser_1.default.json();
const limiter = (0, express_rate_limit_1.default)({
const server = http_1.default.createServer(exports.app);
// Import required modules and dependencies
// Create an Express application
// Create a JSON parser middleware
// Define the API version route prefix
// Apply security middleware
// Apply custom logging middleware
// Serve Swagger UI for API documentation
// Apply authentication middleware to all routes under the API version prefix
// Set up rate limiting to prevent abuse
// NOTE: With all requests coming from a single WhatsApp chatbot, rate limiting might cause issues
// Consider adjusting or removing rate limiting based on your specific use case
// Start cron jobs for scheduled tasks (e.g., daily credcoin offering, minute transaction queue)
// Apply route handlers for different modules
// Apply error handling middleware
// Create HTTP server
// Start the server
// Handle uncaught exceptions
    // Perform any necessary cleanup
    // TODO: Implement a more robust error reporting mechanism (e.g., send to a monitoring service)
    // Gracefully shut down the server
// Handle unhandled rejections
    // Perform any necessary cleanup
    // TODO: Implement a more robust error reporting mechanism (e.g., send to a monitoring service)
// Implement graceful shutdown
        // Perform any additional cleanup (e.g., close database connections)
//# sourceMappingURL=index.js.map
```

## build/src/tests/services/CheckLedgerVsSearchBalances.js
```
const neo4j_1 = require("../../../config/neo4j");
async function CheckLedgerVsSearchBalances() {
        // Query ledgerSpace for credex data
        // Query searchSpace for credex data
        // Process ledgerSpace results
        // Process searchSpace results
        // Create a map for quick lookup from searchSpace
        // Compare and analyze the data
            // If the credex does not exist in searchSpace and the amount in ledgerSpace is 0, count as a match
        // Return the results
//# sourceMappingURL=CheckLedgerVsSearchBalances.js.map
```

## build/src/tests/services/ClearDevDb.js
```
const neo4j_1 = require("../../../config/neo4j");
async function ClearDevDbService() {
    //check success first
//# sourceMappingURL=ClearDevDb.js.map
```

## build/src/tests/services/CreateRandomFloatingCredexes.js
```
const neo4j_1 = require("../../../config/neo4j");
async function getDateAndRandCounterparties() {
async function CreateRandomFloatingCredexesService(numNewTransactions) {
    /*
          // floating credex due in 8-34 days
      // Process in batches of `batchSize`
    */
//# sourceMappingURL=CreateRandomFloatingCredexes.js.map
```

## build/src/tests/services/CreateTestLoop.js
```
async function CreateTestLoopService(numNewTransactions) {
    /*
    // Iterate numNewTransactions times
        //securedCredex: true,
    */
//# sourceMappingURL=CreateTestLoop.js.map
```

## build/src/tests/services/CreateTestMembersAndAccounts.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const axios_1 = __importDefault(require("axios"));
const neo4j_1 = require("../../../config/neo4j");
const OnboardMember_1 = require("../../api/Member/services/OnboardMember");
const CreateAccount_1 = require("../../api/Account/services/CreateAccount");
const lodash_1 = require("lodash");
async function CreateTestMembersAndAccountsService(numNewAccounts) {
            // Fetch a new name for each iteration
            // comment out when daily limit reached        
            /*
            // comment out when name coming from query above
            */
            // need to check if phone unique here and generate new if not
        // Process in batches of `batchSize`
        // Process in batches of `batchSize`
//# sourceMappingURL=CreateTestMembersAndAccounts.js.map
```

## build/src/tests/services/PurchaseSecuredCredexes.js
```
async function PurchaseSecuredCredexesService(denom, number, lowValue, highValue) {
    /*
          // Step 1: Select a random audited account
          // Step 2: Collect account IDs for purchasers
    */
//# sourceMappingURL=PurchaseSecuredCredexes.js.map
```

## build/src/tests/services/SellSecuredCredexes.js
```
async function SellSecuredCredexesService(denom, number) {
    /*
              // Handle error as needed
    */
//# sourceMappingURL=SellSecuredCredexes.js.map
```

## build/src/tests/services/InEcosystemSecuredCredexes.js
```
async function InEcosystemSecuredCredexesService(denom, number) {
    /*
              // Handle error as needed
  */
//# sourceMappingURL=InEcosystemSecuredCredexes.js.map
```

## build/src/tests/services/GrowthTest.js
```
const CreateTestMembersAndAccounts_1 = require("./CreateTestMembersAndAccounts");
const CreateRandomFloatingCredexes_1 = require("./CreateRandomFloatingCredexes");
const DailyCredcoinOffering_1 = require("../../core-cron/DCO/DailyCredcoinOffering");
const MinuteTransactionQueue_1 = require("../../core-cron/MTQ/MinuteTransactionQueue");
const neo4j_1 = require("../../../config/neo4j");
const PurchaseSecuredCredexes_1 = require("./PurchaseSecuredCredexes");
const SellSecuredCredexes_1 = require("./SellSecuredCredexes");
const InEcosystemSecuredCredexes_1 = require("./InEcosystemSecuredCredexes");
async function GrowthTestService(variables) {
        // Get current number of accounts
//# sourceMappingURL=GrowthTest.js.map
```

## build/src/tests/controllers/checkLedgerVsSearchBalances.js
```
const CheckLedgerVsSearchBalances_1 = require("../services/CheckLedgerVsSearchBalances");
async function CheckLedgerVsSearchBalancesController(_req, res) {
        // Send a success response
        // Handle errors and send an appropriate error response
//# sourceMappingURL=checkLedgerVsSearchBalances.js.map
```

## build/src/tests/controllers/clearDevDb.js
```
const ClearDevDb_1 = require("../services/ClearDevDb");
async function ClearDevDbController(req, res) {
        // Call the service to clear the development database
        // Send a success response
        // Handle errors and send an appropriate error response
//# sourceMappingURL=clearDevDb.js.map
```

## build/src/tests/controllers/createRandomFloatingCredexes.js
```
const CreateRandomFloatingCredexes_1 = require("../services/CreateRandomFloatingCredexes");
async function CreateRandomFloatingCredexesController(req, res) {
    // Check if numNewTransactions is provided in the request body
        // Call the service to create test transactions
        // Send the response with the created test transactions
        // Handle errors and send an appropriate error response
//# sourceMappingURL=createRandomFloatingCredexes.js.map
```

## build/src/tests/controllers/createTestLoop.js
```
const CreateTestLoop_1 = require("../services/CreateTestLoop");
async function CreateTestLoopController(req, res) {
    // Check if numNewTransactions is provided in the request body
        // Call the service to create test transactions
        // Send the response with the created test transactions
        // Handle errors and send an appropriate error response
//# sourceMappingURL=createTestLoop.js.map
```

## build/src/tests/controllers/createTestMembersAndAccounts.js
```
const CreateTestMembersAndAccounts_1 = require("../services/CreateTestMembersAndAccounts");
async function CreateTestMembersAndAccountsController(req, res) {
    // Check if numNewAccounts is provided in the request body
        // Call the service to create test accounts
        // Send the response with the created test accounts
        // Handle errors and send an appropriate error response
//# sourceMappingURL=createTestMembersAndAccounts.js.map
```

## build/src/tests/controllers/forceDCO.js
```
const DailyCredcoinOffering_1 = require("../../core-cron/DCO/DailyCredcoinOffering");
async function ForceDcoController(req, res) {
//# sourceMappingURL=forceDCO.js.map
```

## build/src/tests/controllers/forceMTQ.js
```
const MinuteTransactionQueue_1 = require("../../core-cron/MTQ/MinuteTransactionQueue");
async function ForceMtqController(req, res) {
//# sourceMappingURL=forceMTQ.js.map
```

## build/src/tests/controllers/growthTest.js
```
const GrowthTest_1 = require("../services/GrowthTest");
async function GrowthTestController(req, res) {
        // Handle errors and send an appropriate error response
//# sourceMappingURL=growthTest.js.map
```

## build/src/tests/controllers/offerAndAcceptCredex.js
```
async function OfferAndAcceptCredexController(req, res) {
        /*
          */
//# sourceMappingURL=offerAndAcceptCredex.js.map
```

## build/src/tests/integration/account.test.js
```
var __importDefault = (this && this.__importDefault) || function (mod) {
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../../index"); // Adjust this import based on your app structure
const neo4j_1 = require("../../../config/neo4j");
        // Set up any necessary test data
        // Clean up test data and close connections
    // Add more test cases for other account-related endpoints
//# sourceMappingURL=account.test.js.map
```

## build/src/tests/utils/denomUtils.test.js
```
const denomUtils_1 = require("../../utils/denomUtils");
//# sourceMappingURL=denomUtils.test.js.map
```

## build/src/tests/utils/validators.test.js
```
const validators_1 = require("../../utils/validators");
//# sourceMappingURL=validators.test.js.map
```

