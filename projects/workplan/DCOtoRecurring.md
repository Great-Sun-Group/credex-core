# DCO to Recurring Templates Migration

## Overview
Enhance the recurring template system to support different template types, with DCO participation being managed through specialized DCO_GIVE templates. This improves flexibility and maintainability by providing type-specific template processing.

## Current Understanding

### Core Changes
- Create a flexible template system supporting different types (DCO_GIVE, regular recurring add type)
- DCO_GIVE templates store DCOgiveInCXX and DCOdenom for rate calculations
- Templates are processed differently based on type
- Foundation XO automatically accepts valid templates

### Key Requirements

#### Template System
1. Template Types:
   - Support multiple template types (DCO_GIVE, regular recurring)
   - Each type can have its own specific variables
   - Type determines processing flow
   - Maintain clear separation between different template types

2. DCO_GIVE Templates:
   - Store DCOgiveInCXX and DCOdenom variables
   - Target the foundation account
   - Used for DCO participation and rate calculations
   - Processed through DCO execution flow

3. Regular Recurring Templates:
   - Store amount and denomination variables
   - Can target any valid account
   - Used for standard recurring transactions
   - Processed through DCOavatars

#### Processing Flows
1. Template Creation:
   - Type-specific validation rules
   - Type-specific required variables
   - Common base validation (target account, etc.)
   - Auto-acceptance rules per type

2. DCO_GIVE Processing:
   - Templates feed directly into DCO process
   - DCOgiveInCXX/DCOdenom used for rate calculations
   - Integrated with existing DCO execution flow
   - Maintains current rate calculation logic

3. Regular Recurring Processing:
   - Continues through existing DCOavatars flow
   - Uses standard amount/denomination fields
   - Maintains current recurring transaction logic
   - No changes to existing avatar processing

## Implementation Plan

### Phase 1: Template System Enhancement
1. Template Type Support:
   - Add type field to templates
   - Implement type-specific schemas
   - Create type validation system
   - Update template creation logic

2. Variable Storage:
   - Support type-specific variables
   - Add DCOgiveInCXX/DCOdenom for DCO_GIVE
   - Maintain amount/denomination for regular
   - Implement variable validation

3. Creation Flow:
   - Update createRecurring endpoint
   - Add type-specific validation
   - Implement auto-acceptance rules
   - Error handling per type

### Phase 2: Processing Integration
1. DCO Integration:
   - Update DCO process to use templates
   - Read DCOgiveInCXX/DCOdenom from templates
   - Maintain rate calculation logic
   - Error handling

2. DCOavatars Updates:
   - Filter out DCO_GIVE templates
   - Process only regular templates
   - Maintain existing avatar logic
   - Error handling

### Phase 3: System Integration
1. Process Flow:
   - Template type routing
   - Processing separation
   - Error recovery
   - State management

2. Validation & Testing:
   - Template type handling
   - Variable validation
   - Processing flow verification
   - Error handling

## Key Considerations

### Data Model
- Clear template type definition
- Type-specific variable storage
- Processing flow indicators
- Validation rules per type

### Error Handling
- Type-specific validation errors
- Processing flow errors
- Variable validation issues
- Recovery procedures

### Monitoring
- Template type tracking
- Processing flow status
- Rate calculation verification
- System health checks

## Success Criteria
1. System supports multiple template types
2. DCO_GIVE templates store and process DCO variables
3. Regular templates maintain current functionality
4. Templates route to correct processing flows
5. Rate calculations work correctly with template data
6. System maintains proper error handling
7. All processes properly logged and monitored

## Dependencies
- Recurring template service
- DCO processing system
- DCOavatars system
- Rate calculation services
- Authorization system

## Next Steps
1. Update template data model
2. Modify createRecurring endpoint
3. Update processing flows
4. Implement type routing
5. Add comprehensive testing

## Questions to Resolve
1. Template type extensibility
2. Variable validation rules
3. Processing flow routing
4. Error recovery procedures
5. Monitoring requirements

This document will be updated as implementation progresses and new requirements or considerations are identified.
