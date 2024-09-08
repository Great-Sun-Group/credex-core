# searchSpace schema

The SearchSpace schema represents a simplified and optimized version of the ledger space, designed for efficient loop finding in the Credex ecosystem. This schema is optimized to facilitate the resource-efficient identification of credloops for the Minute Transaction Queue (MTQ) process.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#4a4a4a', 'primaryTextColor': '#fff', 'primaryBorderColor': '#7C0000', 'lineColor': '#F8B229', 'secondaryColor': '#006100', 'tertiaryColor': '#fff'}}}%%

graph TD
    %% Nodes
    A1[Account 1]:::accountNode
    A2[Account 2]:::accountNode
    A3[Account 3]:::accountNode
    SA1[FLOATING]:::searchAnchorFloating
    SA2[USD_SECURED]:::searchAnchorUSDSecured
    SA3[CAD_SECURED]:::searchAnchorCADSecured
    C1[Credex 1]:::credexNode
    C2[Credex 2]:::credexNode
    C3[Credex 3]:::credexNode
    C4[Credex 4]:::credexNode

    %% Relationships
    A1 --> |FLOATING| SA1
    SA1 --> |FLOATING| A2
    A2 --> |USD_SECURED| SA2
    SA2 --> |USD_SECURED| A3
    A2 --> |CAD_SECURED| SA3
    SA3 --> |CAD_SECURED| A3
    SA1 --> |SEARCH_SECURED| C1
    SA2 --> |SEARCH_SECURED| C2
    SA3 --> |SEARCH_SECURED| C3
    SA3 --> |SEARCH_SECURED| C4

    %% Styles
    classDef accountNode fill:#3498db,stroke:#2980b9,color:#fff,rx:10,ry:10;
    classDef searchAnchorFloating fill:#006400,stroke:#004d00,color:#fff,rx:10,ry:10;
    classDef searchAnchorUSDSecured fill:#b87333,stroke:#a66a2e,color:#fff,rx:10,ry:10;
    classDef searchAnchorCADSecured fill:#008080,stroke:#006666,color:#fff,rx:10,ry:10;
    classDef credexNode fill:#4B0082,stroke:#3B0062,color:#fff,rx:10,ry:10;

```

## Node properties

### Account

- accountID: string
- accountName: string

### SearchAnchor

- searchAnchorID: string
- earliestDueDate: Date

### Credex

- credexID: string
- outstandingAmount: number
- Denomination: string
- CXXmultiplier: number
- dueDate: Date

## Relationship Properties

### FLOATING

- (No properties)

### USD_SECURED, CAD_SECURED

- (No properties)

### SEARCH_SECURED

- (No properties)

## Explanation

1. **Accounts**: Represented by blue nodes, these are simplified versions of the accounts in the ledger space. They contain only essential information needed for loop finding.

2. **SearchAnchors**: These nodes come in three types:

   - FLOATING (dark green): Represent unsecured credit relationships between accounts.
   - USD_SECURED (copper): Represent secured credit relationships in USD.
   - CAD_SECURED (teal): Represent secured credit relationships in CAD.

3. **Credexes**: Shown as dark purple nodes, these represent individual credit transactions in the system.

4. **Relationships**:
   - FLOATING (dark green): Connects accounts to floating SearchAnchors, representing unsecured credit relationships.
   - USD_SECURED (copper): Connect accounts to USD_SECURED SearchAnchors, representing secured credit relationships in USD.
   - CAD_SECURED (teal): Connect accounts to CAD_SECURED SearchAnchors, representing secured credit relationships in CAD.
   - SEARCH_SECURED (dark purple): Links SearchAnchors to Credexes, allowing for efficient traversal during loop finding.

This optimized structure allows the Minute Transaction Queue to quickly identify potential credit loops by traversing the relationships between Accounts, SearchAnchors, and Credexes. The use of SearchAnchors as intermediary nodes between Accounts and Credexes significantly reduces the complexity of loop finding algorithms, enabling faster processing of transactions in the Credex ecosystem.