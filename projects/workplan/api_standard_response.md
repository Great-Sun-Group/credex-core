# API Standard Response Format

## Overview
This document defines the standard response format for all API endpoints, and next steps to implement it.

The format is designed to be:
- Consistent across all endpoints
- Clear separation between human and machine-readable data
- Efficient for both simple and sophisticated clients
- Expandable without breaking changes


## Response Structure

### HTTP Level
- Protocol-level results are communicated via standard HTTP status codes
- Examples: 201 Created, 400 Bad Request, 404 Not Found
- Status code in header provides immediate result without parsing body

### Response Body
```typescript
{
  message: string,       // Human-friendly message
  data: {
    action: {
      id: string,       // Resource ID (e.g., credexID)
      type: string,     // Business action (e.g., "CREDEX_ACCEPTED")
      timestamp: string, // When the action occurred
      actor: string,    // Who performed the action (memberID/accountID)
      details: {...}    // Action-specific data
    },
    dashboard: {...}    // Full dashboard state
  }
}
```

## Field Descriptions

### message
- Human-friendly message suitable for direct display to users
- Contains relevant data in natural language
- Examples:
  - "Secured credex for $2.58 USD offered to Vimbisopay: Trust."
  - "Secured credex for $2.58 USD accepted by Vimbisopay: Trust."
  - "Unable to process credex: insufficient balance."
  - "MyCompany: Operations account created with a default denomination of USD."

### data.action
Core fields present in every action response:
- id: Primary identifier for the affected resource
- type: Specific business action that occurred
- timestamp: ISO 8601 datetime of when action occurred
- actor: Identifier for who performed the action
- details: Action-specific data structure

### data.dashboard
- Complete dashboard state after the action
- Ensures clients always have current state
- Reduces race conditions from separate dashboard fetches
- Makes client development simpler with automatic updates

## Examples

### Successful Credex Creation
```typescript
// HTTP Status: 201 Created
{
  message: "You offered a credex for $2.58 USD to Vimbisopay: Trust.",
  data: {
    action: {
      id: "credex-123",
      type: "CREDEX_CREATED",
      timestamp: "2024-01-12T15:30:45Z",
      actor: "account-456",
      details: {
        amount: "2.58",
        denomination: "USD",
        securedCredex: true,
        receiverAccountID: "account-789",
        receiverAccountName: "Your Business"
      }
    },
    dashboard: {
      // Full dashboard data
    }
  }
}
```

### Failed Credex Creation
```typescript
// HTTP Status: 400 Bad Request
{
  message: "Unable to create credex: daily limit exceeded.",
  data: {
    action: {
      id: null,
      type: "CREDEX_CREATE_FAILED",
      timestamp: "2024-01-12T15:31:00Z",
      actor: "account-456",
      details: {
        reason: "DAILY_LIMIT_EXCEEDED",
        limit: "100.00",
        denomination: "USD"
      }
    },
    dashboard: {
      // Current dashboard state
    }
  }
}
```

### Credex Acceptance
```typescript
// HTTP Status: 200 OK
{
  message: "Credex accepted successfully.",
  data: {
    action: {
      id: "credex-123",
      type: "CREDEX_ACCEPTED",
      timestamp: "2024-01-12T15:32:00Z",
      actor: "account-789",
      details: {
        acceptorAccountID: "account-789",
        amount: "2.58",
        denomination: "USD"
      }
    },
    dashboard: {
      // Updated dashboard state
    }
  }
}
```

## Benefits

1. Consistency
   - All endpoints follow same structure
   - Predictable field locations and naming
   - Clear separation of concerns

2. User Experience
   - Ready-to-display messages for simple clients
   - Detailed data for sophisticated interfaces
   - Always-current dashboard state

3. Developer Experience
   - Consistent error handling
   - Reduced state management complexity
   - Clear separation between UI text and data
   - Self-documenting responses

4. Performance
   - Single request provides all needed data
   - Reduces race conditions
   - Bandwidth trade-off justified by simplified client logic

5. Maintainability
   - Expandable without breaking changes
   - Clear structure for documentation
   - Easy to add new action types
   - Consistent error handling patterns

## Implementation Notes

1. Controllers should:
   - Use appropriate HTTP status codes
   - Format messages consistently
   - Include all required action fields
   - Return fresh dashboard data

2. Error Responses:
   - Use appropriate HTTP error codes
   - Provide helpful user messages
   - Include error details in action.details
   - Return current dashboard when possible

3. Testing:
   - Verify HTTP status codes
   - Check message formatting
   - Validate required action fields
   - Ensure dashboard is current

4. Documentation:
   - List possible action types
   - Document expected details structure
   - Provide example responses
   - Explain error scenarios


# Next Steps

1. Update routes (swagger) in Member module
2. Update services in Member module
3. Update controlers in Member module
4. Update tests in tests/api/integration
5. Update this list to be for the next module in this order:
   1. DevAdmin
   2. Member
   3. Account
   4. Credex
   5. Recurring (no tests yet)
   6. Admin (no tests yet)
