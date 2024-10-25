# ledgerSpace schema

```mermaid
graph TB
    D[Daynode]

    subgraph Members
        M1[Member]
        M2[Member]
    end

    subgraph Accounts
        A1[Account]
        A2[Account]
        A3[Account]
    end

    subgraph Credexes
        C1[Credex]
        C2[Credex]
        C3[Credex]
        LA[LoopAnchor]
    end

    M1 --> |OWNS| A1
    M1 --> |OWNS| A2
    M2 --> |OWNS| A3

    A1 --> |OWES/CLEARED| C1
    C1 --> |OWES/CLEARED| A2
    A2 --> |OWES/CLEARED| C2
    C2 --> |OWES/CLEARED| A3
    A3 --> |OWES/CLEARED| C3
    C3 --> |OWES/CLEARED| A1

    A1 --> |OFFERS/REQUESTS| C1
    C1 --> |OFFERS/REQUESTS| A2
    A2 --> |OFFERS/REQUESTS| C2
    C2 --> |OFFERS/REQUESTS| A3
    A3 --> |OFFERS/REQUESTS| C3
    C3 --> |OFFERS/REQUESTS| A1

    A1 --> |OFFERED/REQUESTED| C1
    C1 --> |OFFERED/REQUESTED| A2
    A2 --> |OFFERED/REQUESTED| C2
    C2 --> |OFFERED/REQUESTED| A3
    A3 --> |OFFERED/REQUESTED| C3
    C3 --> |OFFERED/REQUESTED| A1

    C1 --> |REDEEMED| LA
    C2 --> |REDEEMED| LA
    C3 --> |REDEEMED| LA

    C1 --> |CREDLOOP| C2
    C2 --> |CREDLOOP| C3
    C3 --> |CREDLOOP| C1

    M1 --> |CREATED_ON| D
    M2 --> |CREATED_ON| D
    A1 --> |CREATED_ON| D
    A2 --> |CREATED_ON| D
    A3 --> |CREATED_ON| D
    C1 --> |CREATED_ON| D
    C2 --> |CREATED_ON| D
    C3 --> |CREATED_ON| D
    LA --> |CREATED_ON| D
```

\*\* relationship names separated by "/" indicates that only one of those relationship types can exist between the two nodes.

## Node Properties

### Member

- memberID: string
- memberHandle: string
- firstname: string
- lastname: string
- phone: string
- email: string
- memberTier: number

### Account

- accountID: string
- accountHandle: string
- accountName: string
- accountType: string
- DCOgiveInCXX: number
- DCOdenom: string
- queueStatus: string

### Credex

- credexID: string
- InitialAmount: number
- OutstandingAmount: number
- RedeemedAmount: number
- DefaultedAmount: number
- WrittenOffAmount: number
- Denomination: string
- CXXmultiplier: number
- credexType: string
- dueDate: Date
- DateRedeemed: Date
- queueStatus: string

### LoopAnchor

- loopID: string
- loopedAt: DateTime
- LoopedAmount: number
- CXXmultiplier: number
- Denomination: string

### Daynode

- Date: Date
- Active: boolean
- DCOrunningNow: boolean
- MTQrunningNow: boolean
- CXXprior_CXXcurrent: number
- CXX: number
- USD: number
- CAD: number
- ZWG: number

## Relationship Properties

### OWNS

- (No properties)

### OWES/CLEARED

- (No properties)

### OFFERS/REQUESTS

- (No properties)

### OFFERED/REQUESTED

- (No properties)

### REDEEMED

- AmountRedeemed: number
- AmountOutstandingNow: number
- Denomination: string
- CXXmultiplier: number
- createdAt: DateTime
- redeemedRelID: string

### CREDLOOP

- AmountRedeemed: number
- AmountOutstandingNow: number
- Denomination: string
- CXXmultiplier: number
- createdAt: DateTime
- loopID: string
- credloopRelID: string

### CREATED_ON

- (No properties)

### CREATED_ON

- (No properties)