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

## Implementation Guide

### 1. Using Shared Types
Import the required types from the shared types package:
```typescript
import { 
  TypedApiResponse, 
  ApiActionType, 
  MemberActionDetails,
  ErrorActionDetails 
} from "../types/apiResponse";
```

### 2. Define Response Types
Create specific types for your endpoint:
```typescript
// Extend base details if needed
type LoginDetails = MemberActionDetails & {
  token?: string;
};

// Create response types
type LoginResponse = TypedApiResponse<LoginDetails>;
type LoginErrorResponse = TypedApiResponse<ErrorActionDetails>;
```

### 3. Service Pattern
Services should:
- Focus on specific business logic
- Return clear success/failure status
- Include relevant data in response
- Handle errors appropriately

Example service response interface:
```typescript
interface ServiceResult {
  success: boolean;
  data?: {
    // Action-specific data
  };
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}
```

### 4. Controller Pattern with Dashboard
Controllers should:
- Use the withDashboard helper for responses
- Handle errors consistently
- Return proper HTTP status codes

Example controller pattern:
```typescript
// Create base response without dashboard
const baseResponse = {
  message: "Operation successful",
  data: {
    action: {
      id: resourceId,
      type: ApiActionType.OPERATION_TYPE,
      timestamp: new Date().toISOString(),
      actor: actorId,
      details: {
        // Action-specific details
      }
    }
  }
};

// Add dashboard data to response
const response = await withDashboard(
  baseResponse,
  memberID,
  accountID,
  requestId
);

res.status(200).json(response);
```

### 5. Error Response Pattern
```typescript
const errorResponse: ErrorResponse = {
  message: "Error message",
  data: {
    action: {
      id: null,
      type: ApiActionType.ERROR_TYPE,
      timestamp: new Date().toISOString(),
      actor: "system",
      details: {
        code: "ERROR_CODE",
        reason: "Error reason",
        field?: "field_name"
      }
    },
    dashboard: {}
  }
};
```

## Implementation Progress

### Completed

1. Account Module:
   - ✓ UpdateAccount.ts service and controller standardized
   - ✓ Added proper TypeScript interfaces
   - ✓ Improved error handling
   - ✓ Added dashboard integration
   - ✓ Added better documentation

2. Credex Module:
   Services:
   - ✓ GetPendingOffersIn.ts
   - ✓ GetPendingOffersOut.ts
   - ✓ GetSecuredAuthorization.ts
   - ✓ AcceptCredex.ts
   - ✓ CancelCredex.ts
   - ✓ DeclineCredex.ts
   - ✓ CreateCredex.ts
   - ✓ GetCredex.ts

   Key Improvements:
   - ✓ Standard success/message/data response structure
   - ✓ Proper TypeScript interfaces for all data types
   - ✓ Consistent error handling with error codes
   - ✓ Better logging patterns
   - ✓ Improved type safety
   - ✓ Better documentation
   - ✓ Dashboard integration where applicable

### Needs Revisiting
1. Member Module Dashboard Integration:
   - Update account dashboard types after Account module standardization
   - Ensure consistent dashboard structure
   - Verify proper error propagation from Account services

2. Authentication Flow:
   - Review login responses after other modules are updated
   - Ensure consistent token handling
   - Standardize authentication error patterns

### Next Steps

1. Update test suites
   - Add response format validation
   - Test error scenarios comprehensively
   - Verify dashboard updates
   - Test pagination functionality
   - Document testing patterns
   - Add response schema validation

2. Review and update API documentation
   - Add new type definitions
   - Update example responses
   - Document error patterns
   - Document pagination patterns
   - Add implementation guidelines
   - Include migration guide for clients

## Lessons Learned & Best Practices

1. Service Layer Patterns:
   - Always use TypeScript interfaces for input/output types
   - Return standardized result object with success/message/data/error
   - Store complex data in variables for type safety
   - Use proper type guards for optional data
   - Include comprehensive logging
   - Handle all error cases explicitly

2. Error Handling:
   - Use specific error codes for different scenarios
   - Include helpful error messages and suggestions
   - Maintain consistent error response structure
   - Log errors with appropriate context
   - Handle both expected and unexpected errors

3. Dashboard Integration:
   - Use withDashboard helper consistently
   - Include dashboard data in successful responses
   - Return empty dashboard object in error responses
   - Consider performance implications
   - Handle missing dashboard data gracefully

4. Type Safety:
   - Define clear interfaces for all data structures
   - Use type guards for optional data
   - Store complex data in variables with proper types
   - Validate all input parameters
   - Handle undefined/null cases explicitly

5. Logging:
   - Include requestId in all log messages
   - Log entry/exit points of services
   - Log important state transitions
   - Include relevant context in error logs
   - Use appropriate log levels

## Success Metrics

1. Code Quality
   - All endpoints follow standard format
   - Proper TypeScript typing
   - Consistent error handling
   - Clean code structure
   - Well-documented APIs
   - Comprehensive tests

2. Developer Experience
   - Clear response format
   - Predictable behavior
   - Helpful error messages
   - Easy to integrate
   - Well-documented
   - Good test coverage

3. Performance
   - Efficient queries
   - Proper pagination
   - Optimized responses
   - Minimal overhead
   - Fast dashboard updates
   - Good error recovery

4. Maintainability
   - Consistent patterns
   - Clear structure
   - Good documentation
   - Easy to extend
   - Testable code
   - Version compatibility

## Conclusion

The API standardization effort has established a solid foundation with:
- Consistent response format across endpoints
- Strong typing with TypeScript
- Proper error handling patterns
- Dashboard state management
- Pagination support
- Clear documentation

Continue following these patterns while updating remaining services and modules. Focus on maintaining consistency while allowing for module-specific requirements. Keep documentation updated and ensure comprehensive test coverage.
