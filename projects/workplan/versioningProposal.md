# API Versioning Strategy Proposal

## Context
- Accounting API connected to a shared ledger graph database
- Target audience: Global public
- Initial phase: Full control over client applications
- Future state: Zero control over client applications
- Expected lifespan: Decades
- Core requirement: Database-level changes must maintain backward compatibility

## Proposed Change
Launch without versioning, focusing instead on robust, forward-compatible design patterns.

The most important consideration here is actually that for as long as we remain in full control or close coordination with all client apps, changes that would requires versioning (including the re-adding of versioning altogether) are not hard to make. So although this seems like a big decision, we can walk it back pretty easily if it proves to be the wrong one.

## Key Insights

### Database vs API Layer
- Database changes MUST be backward compatible due to the nature of shared ledger accounting
- API-only changes (response structure, authentication, etc.) could theoretically have breaking changes
- Initial control over client applications allows for early refinement before public release

### Types of Potential Changes

#### Database-Affecting Changes (Must Be Backward Compatible):
- Transaction structures
- Account relationships
- Ledger entries
- Financial calculations
- Data integrity rules

#### API-Only Changes (Could Be Breaking):
- Response formatting
- Authentication methods
- Error handling
- Nested object structures
- Outward-facing field naming
- Documentation structure

## Proposal: Launch Without Versioning

### Pros
1. Simpler implementation and maintenance
2. Cleaner URLs
3. Forces better initial API design
4. Aligns with database's requirement for backward compatibility
5. Can add versioning later if needed (current API becomes implicit v1)
6. Reduced complexity in documentation and client implementation

### Cons
1. Less flexibility for future breaking changes
2. May require more careful initial design
3. Could limit certain types of API evolution
4. Might need to maintain suboptimal patterns longer

### Risk Mitigation Strategies

1. Before opening client access to the public (removing CLIENT_API_KEY)
   - Extensive peer review of API design
   - Thorough testing with initial client applications
   - Conservative approach to object structures
   - Build in extension points for future features

2. Development Practices
   - Comprehensive documentation
   - Strong typing where possible
   - Extensive automated testing
   - Clear deprecation policies

3. Future-Proofing
   - Design patterns that allow feature additions without breaking changes
   - Metadata fields for future expansion
   - Clear stability guarantees in documentation
   - Monitoring of API usage patterns

4. Escape Hatch
   - If needed, versioning can be added later
   - Original API becomes default/v1
   - New versions can be added for truly breaking changes

## Implementation Guidelines

1. API Design Principles
   - Use generic structures that can be extended
   - Include metadata fields for future expansion
   - Choose semantic field names that won't need changing
   - Build in backwards compatibility from the start
   - Document extensively with clear stability guarantees

2. Change Management
   - Establish clear processes for evaluating changes
   - Set up monitoring for API usage patterns
   - Create deprecation policies
   - Maintain detailed changelog

3. Communication Strategy
   - Clear documentation of stability guarantees
   - Regular updates to API consumers
   - Transparent roadmap
   - Established support channels

## Notable Examples of APIs Without Version Numbers
Some of these APIs have technically implemented versioning in various ways, but their design philosophies and practices around backward compatibility and stability provide valuable lessons for a no-versioning approach.

### Stripe
- While Stripe maintains API versions, they don't use them in URLs
- Uses API version in headers or account settings
- Known for excellent API design and backward compatibility
- Changes are made through API version dates rather than numbers
- Reference: https://stripe.com/blog/api-versioning

### GitHub
- Main API (v3) doesn't show version in URLs anymore
- Uses content negotiation through Accept headers
- Focuses on backward compatibility and gradual evolution
- Reference: https://docs.github.com/en/rest

### Fastly
- No version numbers in URLs
- Uses strong backward compatibility guarantees
- Adds new features through new endpoints rather than versions
- Reference: https://developer.fastly.com/reference/api

## Financial/Accounting APIs

### Xero
- While they use versions, their API design philosophy emphasizes stability
- Financial data requires strong backward compatibility
- Reference: https://developer.xero.com/documentation/

### QuickBooks Online
- Minimal version usage in modern API
- Focuses on backward compatibility due to financial nature
- Reference: https://developer.intuit.com/app/developer/qbo/docs/develop

## Design Philosophies Supporting No Versioning

### Roy Fielding (REST creator)
- Argues that proper REST APIs shouldn't need versioning
- Emphasizes the importance of evolvability without breaking changes
- Reference: https://www.infoq.com/articles/roy-fielding-on-versioning/

### Martin Fowler
- Discusses "Tolerant Reader" pattern
- Supports designing APIs that can evolve without breaking
- Reference: https://martinfowler.com/bliki/TolerantReader.html

## Supporting Research

### Microsoft API Guidelines
- Recommends avoiding URL versioning when possible
- Emphasizes backward compatibility
- Reference: https://github.com/microsoft/api-guidelines

### Google API Design Guide
- Emphasizes long-term stability
- Recommends against breaking changes
- Reference: https://cloud.google.com/apis/design

## Key Patterns from These Examples

1. Strong Backward Compatibility
   - Never remove fields
   - Only add optional fields
   - Maintain existing behavior

2. Feature Addition Strategies
   - New endpoints for new capabilities
   - Optional parameters
   - Expandable data structures

3. Communication Patterns
   - Clear documentation
   - Deprecation notices
   - Long sunset periods
   - Strong developer relations

4. Technical Approaches
   - Content negotiation when needed
   - Feature flags
   - Expandable resource representations

## Lessons Learned

1. Success Factors
   - Initial design investment
   - Strong testing practices
   - Clear communication
   - Robust documentation

2. Common Challenges
   - Resistance to change existing patterns
   - Pressure to make breaking changes
   - Technical debt management

3. Mitigation Strategies
   - Design reviews
   - Automated compatibility testing
   - Developer feedback loops
   - Clear governance
