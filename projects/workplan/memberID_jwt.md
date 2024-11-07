# MemberID JWT Migration Plan

## Overview
Currently, memberID is required in request bodies despite being available in JWT. This plan outlines the migration to use memberID from JWT tokens instead of request bodies.

## Affected Endpoints

### Member API
- getMemberByHandle
- getMemberDashboardByPhone
- authForTierSpendLimit

### Credex API
- createCredex
- acceptCredex (signerID)
- acceptCredexBulk (signerID)
- declineCredex (signerID)
- cancelCredex (signerID)
- getCredex

### Account API
- All account endpoints requiring memberID authentication

### Recurring API
- All recurring payment endpoints requiring memberID authentication

## Implementation Steps

1. Update Validation Schemas
- Remove memberID/signerID from request validation schemas
- Update documentation to reflect changes

2. Update Controllers
- Modify controllers to use req.user.memberID instead of req.body.memberID
- For endpoints using signerID, replace with req.user.memberID

3. Update Tests
- Remove memberID from request body in tests
- Add tests verifying proper JWT memberID usage
- Test error cases and security scenarios

## Excluded Endpoints
- login (no auth required)
- onboardMember (no auth required)
- All DevAdmin endpoints (different auth mechanism)

## Benefits
- Improved Security: Prevents memberID spoofing
- DRY Implementation: Eliminates redundant validation
- Reduced Attack Surface: Removes possibility of memberID mismatch
- Simplified API: Reduces payload size and complexity

## Migration Strategy
1. Create feature branch
2. Update one API group at a time
3. Comprehensive testing after each group
4. Update API documentation
5. Deploy changes
6. Monitor for any issues

## Breaking Changes
This change will require clients to:
- Remove memberID from request bodies
- Ensure proper JWT token handling
- Update their test suites
