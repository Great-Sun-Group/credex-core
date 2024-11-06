# API Standardization Implementation Plan

This document outlines the implementation steps for standardizing all API endpoints according to the standards documented in [API Standards](../../docs/develop/developerAPI/api_standards.html).

## Implementation Tasks

### Phase 1: Route Method & Path Standardization

#### 1.1 Avatar Module
```typescript
// Current (recurringRoutes.ts)
router.put('/acceptRecurring', ...)
router.delete('/cancelRecurring', ...)

// Change to
router.post('/acceptRecurring', ...)
router.post('/cancelRecurring', ...)
```

#### 1.2 Admin Routes
```typescript
// Current
router.post('/admin/getCredexDetails', ...)
router.post('/getAccountDetails', ...)

// Standardize to
router.post('/admin/getCredexDetails', ...)
router.post('/admin/getAccountDetails', ...)
```

#### 1.3 DevAdmin Routes
```typescript
// Current
router.post('/devadmin/clearDevDBs', ...)
router.post('devadmin/forceDCO', ...)

// Standardize to
router.post('/devadmin/clearDevDBs', ...)
router.post('/devadmin/forceDCO', ...)
```

### Phase 2: Schema Validation Implementation

#### 2.1 Create DevAdmin Schemas
```typescript
// New file: src/api/DevAdmin/devAdminSchemas.ts
export const clearDevDBsSchema = {
  // Add appropriate validation
};

export const forceDCOSchema = {
  // Add appropriate validation
};

export const gimmeSecuredSchema = {
  // Add appropriate validation
};
```

#### 2.2 Fix Admin Schemas
```typescript
// Update: src/api/Admin/adminSchemas.ts
export const getAccountSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: false,
  },
  accountHandle: {
    sanitizer: s.sanitizeAccountHandle,
    validator: v.validateAccountHandle,
    required: false,
  },
  $atLeastOne: ['accountID', 'accountHandle'],
};
```

### Phase 3: Error Handling Implementation

#### 3.1 Avatar Module
```typescript
// Update: src/api/Avatar/recurringRoutes.ts
router.post('/requestRecurring',
  validateRequest(requestRecurringSchema),
  RequestRecurringController,
  errorHandler
);
```

#### 3.2 DevAdmin Module
```typescript
// Update: src/api/DevAdmin/devAdminRoutes.ts
router.post('/devadmin/clearDevDBs',
  validateRequest(clearDevDBsSchema),
  ClearDevDBsController,
  errorHandler
);
```

### Phase 4: Security Middleware Integration

#### 4.1 Standard Security Headers
All routes must include:
- Authorization header (except keyholes)
- x-client-api-key (for keyholes)
- Content-Type: application/json

#### 4.2 Request/Response Format
Standard request format:
```typescript
{
  headers: {
    Authorization: "Bearer token",
    "Content-Type": "application/json",
    "x-client-api-key": "key" // for keyholes only
  },
  body: {
    // request parameters
  }
}
```

Standard response format:
```typescript
{
  status: "success" | "error",
  statusCode: number,
  data?: any,
  message?: string
}
```

### Phase 5: Logging Standardization

#### 5.1 Standard Log Format
```typescript
logger.debug("Route called", {
  path: req.path,
  method: req.method,
  userId: req.user?.id,
  requestId: req.id
});
```

#### 5.2 Error Logging
```typescript
logger.error("Error in route", {
  error: error.message,
  stack: error.stack,
  path: req.path,
  method: req.method,
  userId: req.user?.id,
  requestId: req.id
});
```

## Implementation Order

1. Route Method Standardization
   - Highest priority
   - Affects API contract
   - Required for consistent client integration

2. Security Middleware Integration
   - Critical for system security
   - Implement consistent auth checks
   - Standardize header requirements

3. Schema Validation
   - Create missing schemas
   - Update existing schemas
   - Implement consistent validation

4. Error Handling
   - Add errorHandler to all routes
   - Standardize error responses
   - Implement proper logging

5. Logging
   - Implement consistent log formats
   - Add performance metrics
   - Standardize error logging

## Testing Requirements

1. Unit Tests
   - Test all validation schemas
   - Test error handling
   - Test security middleware

2. Integration Tests
   - Test complete request flow
   - Verify security headers
   - Test rate limiting

3. Security Tests
   - Test authentication
   - Test authorization
   - Test input validation

## Monitoring & Validation

1. Runtime Checks
   - Log all non-standard requests
   - Monitor rate limit hits
   - Track authentication failures

2. Automated Validation
   - Implement linting rules
   - Add schema validation tests
   - Create API contract tests

## Notes

- DevAdmin routes are only for development environment
- Security headers must be properly validated
- Rate limiting must be consistently applied
- All routes must have proper error handling
- Logging must be comprehensive but not excessive
