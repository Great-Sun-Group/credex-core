# API Standard Response Format

## Overview
This document defines the standard response format for all API endpoints and serves as both implementation guide and reference documentation.

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
  ```typescript
  // Success messages
  "Secured credex for $2.58 USD offered to Vimbisopay: Trust."
  "Member John Doe onboarded successfully with default denomination USD."
  "Dashboard retrieved successfully"
  
  // Error messages
  "Unable to process credex: insufficient balance."
  "Phone number already in use"
  "Invalid member handle format"
  ```

### data.action
Core fields present in every action response:
```typescript
{
  id: string,      // Primary identifier (e.g., memberID, credexID)
  type: string,    // From ApiActionType enum
  timestamp: string, // ISO 8601 datetime
  actor: string,   // Who performed the action
  details: {       // Action-specific data
    // Varies by endpoint
  }
}
```

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
// Example from Member module
type DashboardDetails = MemberActionDetails & {
  memberID: string;
  firstname: string;
  lastname: string;
  memberHandle: string;
  defaultDenom: string;
  memberTier: number;
};

type DashboardResponse = TypedApiResponse<DashboardDetails>;
type DashboardErrorResponse = TypedApiResponse<ErrorActionDetails>;
```

### 3. Service Pattern
Services should:
- Focus on specific business logic
- Return clear success/failure status
- Include relevant data in response
- Handle errors appropriately

Example service response interface:
```typescript
// Example from GetMemberByHandle service
interface GetMemberResult {
  success: boolean;
  data?: MemberData;
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
// Example from OnboardMember controller
const response: OnboardResponse = {
  message: `${firstname} ${lastname}: Personal account created with default denomination ${defaultDenom}.`,
  data: {
    action: {
      id: memberData.memberID,
      type: ApiActionType.MEMBER_ONBOARDED,
      timestamp: new Date().toISOString(),
      actor: memberData.memberID,
      details: {
        memberID: memberData.memberID,
        firstname: memberData.firstname,
        lastname: memberData.lastname,
        memberHandle: memberData.memberHandle,
        defaultDenom: memberData.defaultDenom,
        token,
        defaultAccountID: accountResult.data.accountID
      }
    },
    dashboard: {
      memberTier: dashboardData.memberTier,
      remainingAvailableUSD: dashboardData.remainingAvailableUSD,
      accounts: validAccountDashboards
    }
  }
};
```

### 5. Error Response Pattern
```typescript
// Example from GetMemberByHandle controller
const errorResponse: MemberLookupErrorResponse = {
  message: "Invalid member handle format",
  data: {
    action: {
      id: null,
      type: ApiActionType.ERROR_VALIDATION,
      timestamp: new Date().toISOString(),
      actor: "system",
      details: {
        code: "INVALID_HANDLE",
        reason: "Invalid member handle format",
        field: "memberHandle"
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

3. Member Module:
   Services:
   - ✓ GetMemberByHandle.ts
   - ✓ GetMemberDashboardByPhone.ts
   - ✓ OnboardMember.ts
   - ✓ AuthForTierSpendLimit.ts
   - ✓ LoginMember.ts

   Controllers:
   - ✓ getMemberByHandle.ts
   - ✓ getMemberDashboardByPhone.ts
   - ✓ onboardMember.ts
   - ✓ authForTierSpendLimit.ts
   - ✓ loginMember.ts

   Key Improvements:
   - ✓ Standardized response format across all endpoints
   - ✓ Proper TypeScript interfaces and type safety
   - ✓ Consistent error handling patterns
   - ✓ Improved dashboard integration
   - ✓ Better validation and authorization checks
   - ✓ Enhanced logging and debugging
   - ✓ Clear success/error messages

4. Recurring Module:
   Services:
   - ✓ AcceptRecurring.ts
   - ✓ CancelRecurring.ts
   - ✓ CreateRecurring.ts
   - ✓ GetRecurring.ts

   Controllers:
   - ✓ acceptRecurring.ts
   - ✓ cancelRecurring.ts
   - ✓ createRecurring.ts
   - ✓ getRecurring.ts

   Key Improvements:
   - ✓ Standardized response format across all endpoints
   - ✓ Proper TypeScript interfaces and type safety
   - ✓ Consistent error handling with specific codes
   - ✓ Enhanced logging and debugging
   - ✓ Improved dashboard integration
   - ✓ Template-specific validation
   - ✓ Clear success/error messages

5. Admin Module:
   Services:
   - ✓ GetMemberService.ts
   - ✓ GetCredexService.ts
   - ✓ GetAccountService.ts

   Controllers:
   - ✓ getMemberDetailsController.ts
   - ✓ getCredexDetailsController.ts
   - ✓ getAccountDetailsController.ts

   Key Improvements:
   - ✓ Created Admin-specific types and interfaces
   - ✓ Standardized response format with action and dashboard
   - ✓ Enhanced error handling with Admin-specific error types
   - ✓ Improved type safety with TypeScript
   - ✓ Added comprehensive logging
   - ✓ Better input validation
   - ✓ Clear separation of concerns between services and controllers

### Next Steps

1. Complete Admin Module Standardization
   - Update getReceivedCredexOffersController and service
   - Update getSentCredexOffersController and service
   - Update updateMemberController and service
   - Add more Admin-specific action types as needed

2. Complete DevAdmin Module Standardization
   - Standardize service responses
   - Update controllers with standard patterns
   - Improve error handling
   - Add proper TypeScript interfaces

3. Update Routes for Swagger Documentation
   - Update route definitions with standard format
   - Add proper request/response schemas
   - Document error responses
   - Add authentication requirements
   - Include example requests/responses

4. Update Test Suites
   - Add response format validation
   - Test error scenarios comprehensively
   - Verify dashboard updates
   - Test pagination functionality
   - Document testing patterns
   - Add response schema validation

4. Review and Update API Documentation
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
