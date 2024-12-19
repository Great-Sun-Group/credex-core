# Dashboard Standardization Workplan

## Current Issues
1. Dashboard structure is inconsistent across different endpoints
2. Member-level data incomplete or missing:
   - firstname/lastname not consistently included
   - memberHandle missing in some responses
   - member's defaultDenom not always included
3. Denomination context unclear:
   - Need to distinguish between member and account default denominations
   - Balance descriptions need clarification on denomination context
4. Account type information missing in some responses
5. Documentation doesn't reflect complete dashboard structure
6. remainingAvailableUSD handling needs tier-specific logic

## Implementation Plan

### Phase 1: Core Service Updates
1. Create MemberDashboardService
   - Implement complete member data retrieval:
     - memberID, firstname, lastname, memberHandle
     - memberTier and defaultDenom
     - remainingAvailableUSD (with tier-specific logic)
   - Add proper TypeScript interfaces
   - Include error handling for missing data

2. Update GetAccountDashboardService
   - Ensure accountType is included in response
   - Add missing account properties
   - Clarify denomination context in balances
   - Add proper TypeScript interfaces
   - Improve error handling

3. Create DashboardService utility
   - Combine MemberDashboardService and GetAccountDashboardService
   - Ensure consistent structure matching dashboardSwaggerTemplate.ts
   - Implement proper error handling and data validation
   - Add caching for performance optimization

### Phase 2: Controller Updates
1. Update Member Module Controllers
   - Use new MemberDashboardService
   - Standardize login/onboarding responses
   - Update response types
   - Add proper error handling

2. Update Account Module Controllers
   - Use new DashboardService
   - Ensure denomination context is clear
   - Update response types
   - Standardize error handling

3. Update Credex Module Controllers
   - Use new DashboardService
   - Ensure transaction updates reflect in dashboard
   - Maintain denomination context
   - Update response types

4. Update Recurring Module Controllers
   - Use new DashboardService
   - Ensure recurring transaction info included
   - Update response types
   - Add proper error handling

### Phase 3: Database and Query Optimization
1. Optimize Member Data Queries
   - Create efficient queries for complete member data
   - Add proper indexes
   - Consider caching strategies

2. Optimize Account Queries
   - Review and optimize account data retrieval
   - Add necessary indexes
   - Implement query caching where appropriate

3. Balance Calculation Optimization
   - Review denomination conversion logic
   - Optimize balance calculations
   - Consider caching balance results

### Phase 5: Documentation & Types
1. Update API Documentation
   - Update all Swagger docs to use dashboardSwaggerTemplate.ts
   - Add clear examples for each endpoint
   - Document denomination handling
   - Document tier-specific behavior

2. Update TypeScript Types
   - Create comprehensive type definitions
   - Add proper JSDoc comments
   - Include validation rules
   - Document type constraints

## Implementation Notes
- Use TypeScript interfaces to enforce dashboard structure
- Ensure proper handling of optional fields (e.g., remainingAvailableUSD for high tiers)
- Add detailed logging for debugging
- Consider adding dashboard version field for future updates
- Implement proper error handling at all levels
- Use proper TypeScript types throughout
- Follow consistent naming conventions
- Add comprehensive documentation

## Success Criteria
1. All endpoints return consistent dashboard structure matching dashboardSwaggerTemplate.ts
2. Complete member data included in all responses
3. Clear denomination context throughout
4. Proper handling of tier-specific features
5. Comprehensive test coverage
6. Updated documentation
7. Improved performance metrics
8. Type safety throughout the codebase
