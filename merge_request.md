# Merge Request: Invoice Model Improvements and Daily Limit Fix

## Description

This merge request implements several significant improvements to the Credex system:

1. Fixes the daily limit calculation in SpendLimitService.ts
2. Implements a new invoice model with DEBITS_TO and CREDITS_TO relationships
3. Creates a new getInvoice endpoint for retrieving invoice data by ID

## Changes Made

### 1. Daily Limit Calculation Fix

- **File:** `src/api/Member/services/SpendLimitService.ts`
- **Issue:** The formula was incorrectly using both daynodeUSD and CXXmultiplier, causing a double conversion
- **Fix:** Modified the formula to use only CXXmultiplier for proper conversion: `total + (c.InitialAmount / c.CXXmultiplier)`
- **Verification:** Confirmed Alice's remainingAvailableUSD was correctly calculated as 5 (10 - 5 = 5)

### 2. New Invoice Model Implementation

- **File:** `src/api/Invoice/controllers/GenerateInvoiceController.ts`
- **Changes:**
  - Updated the Invoice node structure to use TotalAmount instead of Amount
  - Implemented a networked ledger model with:
    - DEBITS_TO relationship from Invoice to payment Account (where money comes from)
    - CREDITS_TO relationships from Invoice to AccountInternals (where money goes to)
  - Fixed vendor status checking to use activateMarket property
  - Updated the invoice QR link format to use https://mycredex.app/invoice/{invoiceID}

### 3. New getInvoice Endpoint

- **Files:**
  - `src/api/Invoice/controllers/getInvoice.ts` (new)
  - `src/api/Invoice/routes/getInvoiceRoute.ts` (new)
  - `src/api/Invoice/controllers/index.ts` (updated)
  - `src/api/Invoice/routes/index.ts` (updated)
  - `src/api/Invoice/invoiceValidationSchemas.ts` (updated)
- **Features:**
  - Implemented a controller that retrieves invoice data by ID
  - Added proper error handling for various scenarios
  - Created a route with authentication and client API key verification

## Testing Done

### Daily Limit Fix
- Verified that Alice's remainingAvailableUSD was correctly calculated as 5 (10 - 5 = 5)

### Invoice Model
- Successfully tested with both single and multiple items:
  - Created a single-item invoice for $3 of tomatoes
  - Created a multi-item invoice with $3 of tomatoes and $2 of peppers

### getInvoice Endpoint
- Successfully retrieved an invoice with all its relationships and data:
  ```json
  {
    "invoiceID": "fea6e5ab-47e3-4e89-bc8c-897935f94b03",
    "invoiceQRLink": "https://mycredex.app/invoice/fea6e5ab-47e3-4e89-bc8c-897935f94b03",
    "totalAmount": 5,
    "denomination": "USD",
    "paymentAccountID": "0883eda7-1b1f-4964-bbaa-8c245f5180b6",
    "lines": [
      {
        "accountName": "Fresh Tomatoes",
        "amount": 3
      },
      {
        "accountName": "Fresh Peppers",
        "amount": 2
      }
    ],
    "notes": "Organic produce for delivery"
  }
  ```

## Reviewer Notes

- The daily limit fix ensures accurate tracking of member spending limits
- The new invoice model properly represents the flow of value in the system, with multiple CREDITS_TO relationships to different accounts
- The getInvoice endpoint enables retrieving invoice data for display or processing
- All changes have been tested and are working correctly
