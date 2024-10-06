# API Input Validation Requirements

This document outlines the input validation requirements for the Account-related API endpoints.

## Validators

### UUID
- Format: 8-4-4-4-12 hexadecimal digits (e.g., 123e4567-e89b-12d3-a456-426614174000)

### Member Handle
- Length: 3-30 characters
- Allowed characters: lowercase letters, numbers, periods, and underscores

### Account Name
- Length: 3-50 characters

### Account Handle
- Length: 3-30 characters
- Allowed characters: lowercase letters, numbers, periods, and underscores

## Endpoints

### POST /api/v1/authorizeForAccount
- `memberHandleToBeAuthorized`: Must be a valid Member Handle
- `accountID`: Must be a valid UUID
- `ownerID`: Must be a valid UUID

### POST /api/v1/updateSendOffersTo
- `memberIDtoSendOffers`: Must be a valid UUID
- `accountID`: Must be a valid UUID
- `ownerID`: Must be a valid UUID

### PATCH /api/v1/updateAccount
- `ownerID`: Must be a valid UUID
- `accountID`: Must be a valid UUID
- `accountName` (optional): Must be a valid Account Name
- `accountHandle` (optional): Must be a valid Account Handle
- `defaultDenom` (optional): Must be a valid denomination code

### POST /api/v1/createAccount
- `ownerID`: Must be a valid UUID
- `accountType`: Must be a permitted account type
- `accountName`: Must be a valid Account Name
- `accountHandle`: Must be a valid Account Handle
- `defaultDenom`: Must be a valid denomination code
- `DCOgiveInCXX` (optional): Must be a non-negative number
- `DCOdenom` (optional): Must be a valid denomination code

Note: All endpoints will return a 400 Bad Request error if the input validation fails, along with a descriptive error message.