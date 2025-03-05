# Vimbiso Market Workplan

Adding marketplace functionality to the VimbisoPay app by extending the underlying accounting infrastructure and client app capabilities.

# Munya the farmer adds a vendor profile pic

```mermaid
flowchart TB
    %% Main direction top to bottom with User Flow on top
    
    subgraph Flow["<b><font size='5' color='black'>User Flow</font></b>"]
        direction LR
        subgraph UI["<b><font size='4' color='black'>User Interface</font></b>"]
            direction LR
            S1[Edit Member Profile] --- S2[Add Image Flow]
        end

        subgraph API["<b><font size='4' color='black'>API Endpoints</font></b>"]
            direction LR
            E1[/uploadAndOptimizeJpg\] --- E2[/connectAsset\]
        end
    end

    subgraph Storage["<b><font size='5' color='black'>Data Storage</font></b>"]
        direction LR
        subgraph DB["<b><font size='4' color='black'>Neo4j Database</font></b>"]
            direction TB
            %% Add connector node inside Neo4j Database
            Connector(((" "))):::invisible
            
            M1((munyaFarmer<br/>:Member))
            A2((originalProfilePic<br/>:AssetMarker))
            A1((onboardedAssets<br/>:Account))
            A3((digitalAssets<br/>:Account))
            A4((200profilePic<br/>:AssetMarker))
            A5((600profilePic<br/>:AssetMarker))

            A1 -->|CR| A2
            A2 -->|DR| A3
            A1 -->|CR| A4
            A4 -->|DR| A3
            A1 -->|CR| A5
            A5 -->|DR| A3

            %% USED_IN relationships between original and resized versions
            A2 -->|USED_IN| A4
            A2 -->|USED_IN| A5

            M1 -->|PROFILE_PIC_ORIGINAL_JPG| A2
            M1 -->|PROFILE_PIC_200_JPG| A4
            M1 -->|PROFILE_PIC_600_JPG| A5
        end

        subgraph S3["<b><font size='4' color='black'>S3 Bucket</font></b>"]
            direction TB
            F1>"original.jpg"]
            F2>"200px.jpg"]
            F3>"600px.jpg"]
            F1 --- F2 --- F3
        end
    end

    %% Connect UI to API 
    S2 --> E1
    S2 --> E2
    
    %% Use the connector node to route relationships from API to Database
    E1 --> A2
    E2 --> Connector
    Connector -.-> A2
    Connector -.-> A4
    Connector -.-> A5
    Connector -.-> M1

    %% Connect AssetMarkers to S3 files
    A2 --> F1
    A4 --> F2
    A5 --> F3

    %% Style definitions
    %% Account nodes - darker green with gold text
    style A1 fill:#006400,stroke:#006400,color:#FBB016
    style A3 fill:#006400,stroke:#006400,color:#FBB016

    %% Member nodes - black with white text
    style M1 fill:black,stroke:black,color:white

    %% AssetMarker nodes - #FBB016 with black text
    style A2 fill:#FBB016,stroke:#FBB016,color:black
    style A4 fill:#FBB016,stroke:#FBB016,color:black
    style A5 fill:#FBB016,stroke:#FBB016,color:black

    %% S3 Bucket file nodes - gold with black text
    style F1 fill:#FBB016,stroke:#FBB016,color:black
    style F2 fill:#FBB016,stroke:#FBB016,color:black
    style F3 fill:#FBB016,stroke:#FBB016,color:black

    %% User Flow nodes - white with black text
    style S1 fill:white,stroke:#FBB016,color:black
    style S2 fill:white,stroke:#FBB016,color:black
    style E1 fill:white,stroke:#FBB016,color:black
    style E2 fill:white,stroke:#FBB016,color:black

    %% Make connector invisible
    classDef invisible fill:none,stroke:none

    %% Style all relationships with teal color #04A0B2
    linkStyle default stroke:#04A0B2,stroke-width:2px,color:#04A0B2

    %% Style subgraphs - background colors and text sizes
    style Flow fill:#036980,font-size:20px,font-weight:bold
    style Storage fill:#036980,font-size:20px,font-weight:bold
    style UI fill:#8ECBD6,font-size:16px,font-weight:bold
    style API fill:#8ECBD6,font-size:16px,font-weight:bold
    style DB fill:#8ECBD6,font-size:16px,font-weight:bold
    style S3 fill:#8ECBD6,font-size:16px,font-weight:bold
```

# Munya lists tomatoes in the Vimbiso Market

```mermaid
flowchart TB
    %% Main direction top to bottom with User Flow on top
    
    subgraph Flow["<b><font size='5' color='black'>User Flow</font></b>"]
        direction LR
        subgraph UI["<b><font size='4' color='black'>User Interface</font></b>"]
            direction LR
            S1[Edit Member Profile] --- S2[Add Image Flow]
        end

        subgraph API["<b><font size='4' color='black'>API Endpoints</font></b>"]
            direction LR
            E1[/addAccountInternal\] --- E2[/uploadAndOptimizeJpg\] --- E3[/connectAsset\]
        end
    end

    subgraph Storage["<b><font size='5' color='black'>Data Storage</font></b>"]
        direction LR
        subgraph DB["<b><font size='4' color='black'>Neo4j Database</font></b>"]
            direction TB
            %% Add connector node inside Neo4j Database
            Connector(((" "))):::invisible
            
            A3((tomatoes<br/>:Account))
            A1((onboardedAssets<br/>:Account))
            A2((originalProfilePic<br/>:AssetMarker))
            A4((200profilePic<br/>:AssetMarker))
            A5((600profilePic<br/>:AssetMarker))

            A1 -->|CR| A2
            A2 -->|DR| A3
            A1 -->|CR| A4
            A4 -->|DR| A3
            A1 -->|CR| A5
            A5 -->|DR| A3

            %% USED_IN relationships between original and resized versions
            A2 -->|USED_IN| A4
            A2 -->|USED_IN| A5

            A3 -->|PROFILE_PIC_ORIGINAL_JPG| A2
            A3 -->|PROFILE_PIC_200_JPG| A4
            A3 -->|PROFILE_PIC_600_JPG| A5
        end

        subgraph S3["<b><font size='4' color='black'>S3 Bucket</font></b>"]
            direction TB
            F1>"original.jpg"]
            F2>"200px.jpg"]
            F3>"600px.jpg"]
            F1 --- F2 --- F3
        end
    end

    %% Connect UI to API 
    S2 --> E1
    S2 --> E2
    S2 --> E3
    
    %% Use the connector node to route relationships from API to Database
    E1 --> A3
    E2 --> A2
    E3 --> Connector
    Connector -.-> A2
    Connector -.-> A4
    Connector -.-> A5
    Connector -.-> A3

    %% Connect AssetMarkers to S3 files
    A2 --> F1
    A4 --> F2
    A5 --> F3

    %% Style definitions
    %% Account nodes - darker green with gold text
    style A1 fill:#006400,stroke:#006400,color:#FBB016
    style A3 fill:#006400,stroke:#006400,color:#FBB016

    %% AssetMarker nodes - #FBB016 with black text
    style A2 fill:#FBB016,stroke:#FBB016,color:black
    style A4 fill:#FBB016,stroke:#FBB016,color:black
    style A5 fill:#FBB016,stroke:#FBB016,color:black

    %% S3 Bucket file nodes - gold with black text
    style F1 fill:#FBB016,stroke:#FBB016,color:black
    style F2 fill:#FBB016,stroke:#FBB016,color:black
    style F3 fill:#FBB016,stroke:#FBB016,color:black

    %% User Flow nodes - white with black text
    style S1 fill:white,stroke:#FBB016,color:black
    style S2 fill:white,stroke:#FBB016,color:black
    style E1 fill:white,stroke:#FBB016,color:black
    style E2 fill:white,stroke:#FBB016,color:black
    style E3 fill:white,stroke:#FBB016,color:black

    %% Make connector invisible
    classDef invisible fill:none,stroke:none

    %% Style all relationships with teal color #04A0B2
    linkStyle default stroke:#04A0B2,stroke-width:2px,color:#04A0B2

    %% Style subgraphs - background colors and text sizes
    style Flow fill:#036980,font-size:20px,font-weight:bold
    style Storage fill:#036980,font-size:20px,font-weight:bold
    style UI fill:#8ECBD6,font-size:16px,font-weight:bold
    style API fill:#8ECBD6,font-size:16px,font-weight:bold
    style DB fill:#8ECBD6,font-size:16px,font-weight:bold
    style S3 fill:#8ECBD6,font-size:16px,font-weight:bold
```

## Munya harvests $100 of tomatoes and tracks with production account (optional step)

```mermaid
graph TD
    %% Styles
    classDef screen fill:#d4f1f9,stroke:#05a,stroke-width:2px,color:black,rx:10,ry:10
    classDef endpoint fill:#ffe6cc,stroke:#f90,stroke-width:2px,color:black,shape:hexagon
    classDef account fill:#e1d5e7,stroke:#9673a6,stroke-width:1px,color:black,shape:circle
    classDef asset fill:#d5e8d4,stroke:#82b366,stroke-width:1px,color:black,shape:circle
    classDef property fill:#fff2cc,stroke:#d6b656,stroke-width:1px,color:black,shape:rect

    %% Group screens
    subgraph UI [User Interface]
        S1[Add Account]
        S2[Add Adjusting Entry]
    end

    %% Group endpoints
    subgraph API [API Endpoints]
        E1[/addAccountInternal\]
        E2[/addAssetMarker\]
    end

    %% Graph Relationships - Neo4j Nodes
    subgraph DB [Neo4j Database]
        A1((produceGrown<br>PRODUCTION))
        A2((tomatoesToSell))
        A3((tomatoes))

        A1 -->|CR| A2
        A2 -->|DR| A3
    end

    %% Connect UI to API to Database
    S1 --> E1
    S2 --> E2
    E2 --> A2
    E1 --> A1

    %% Class assignments
    class S1,S2 screen
    class E1,E2 endpoint
    class A1,A3 account
    class A2 asset
    class P1,P2,P3,P4 property
```

## Munya creates an invoice for $20 of tomatoes which are purchased by Farai the merchant

```mermaid
flowchart TB
    %% Main direction top to bottom with User Flows on top
    
    subgraph MunyaFlow["<b><font size='5' color='black'>Munya's User Flow</font></b>"]
        direction LR
        subgraph MunyaUI["<b><font size='4' color='black'>Munya's Interface</font></b>"]
            direction LR
            S1[Vimbiso Store] --- S2[Display QR]
        end

        subgraph MunyaAPI["<b><font size='4' color='black'>Munya's API Endpoints</font></b>"]
            direction LR
            E1[/generateInvoice\]
        end
    end
    
    subgraph FaraiFlow["<b><font size='5' color='black'>Farai's User Flow</font></b>"]
        direction LR
        subgraph FaraiUI["<b><font size='4' color='black'>Farai's Interface</font></b>"]
            direction LR
            S3[Create Credex from Invoice]
        end

        subgraph FaraiAPI["<b><font size='4' color='black'>Farai's API Endpoints</font></b>"]
            direction LR
            E2[/createCredex\]
        end
    end

    subgraph Storage["<b><font size='5' color='black'>Data Storage</font></b>"]
        direction LR
        subgraph DB["<b><font size='4' color='black'>Neo4j Database</font></b>"]
            direction TB
            %% Add connector nodes inside Neo4j Database
            MunyaConnector(((" "))):::invisible
            FaraiConnector(((" "))):::invisible
            QRNode(((" "))):::invisible
            
            M1((munyaFarmer<br/>:Member))
            M2((faraiMerchant<br/>:Member))
            A1((tomatoes<br/>:Account))
            A2((faraiPersonal<br/>:Account))
            I1((tomatoInvoice<br/>:Invoice))
            C1((paymentCredex<br/>:Credex))

            %% Invoice relationships
            I1 -->|CREDITS_TO| A1
            I1 -->|DEBITS_TO| A2
            
            %% Credex executes Invoice
            C1 -->|EXECUTES| I1
            
            %% Member relationships
            M1 -->|OWNS| A1
            M2 -->|OWNS| A2
            M1 -->|CREATED| I1
            M2 -->|CREATED| C1
        end
    end

    %% Connect Munya's UI to API 
    S1 --> E1
    
    %% Connect Farai's UI to API
    S3 --> E2
    
    %% Connect Munya's API to Database
    E1 --> I1
    E1 --> MunyaConnector
    MunyaConnector -.-> M1
    MunyaConnector -.-> A1
    
    %% Connect Farai's API to Database
    E2 --> C1
    E2 --> FaraiConnector
    FaraiConnector -.-> M2
    FaraiConnector -.-> A2
    FaraiConnector -.-> I1
    
    %% Connect the two user flows via QR code
    S2 --> QRNode
    QRNode -.-> S3
    QRNode -.-> I1

    %% Style definitions
    %% Member nodes - black with white text
    style M1 fill:black,stroke:black,color:white
    style M2 fill:black,stroke:black,color:white

    %% Account nodes - darker green with gold text
    style A1 fill:#006400,stroke:#006400,color:#FBB016
    style A2 fill:#006400,stroke:#006400,color:#FBB016

    %% Invoice node - gold with black text
    style I1 fill:#FBB016,stroke:#FBB016,color:black
    
    %% Credex node - gold with black text
    style C1 fill:#FBB016,stroke:#FBB016,color:black

    %% User Flow nodes - white with black text
    style S1 fill:white,stroke:#FBB016,color:black
    style S2 fill:white,stroke:#FBB016,color:black
    style S3 fill:white,stroke:#FBB016,color:black
    style E1 fill:white,stroke:#FBB016,color:black
    style E2 fill:white,stroke:#FBB016,color:black

    %% Make connector invisible
    classDef invisible fill:none,stroke:none

    %% Style all relationships with teal color #04A0B2
    linkStyle default stroke:#04A0B2,stroke-width:2px,color:#04A0B2

    %% Style subgraphs - background colors and text sizes
    style MunyaFlow fill:#036980,font-size:20px,font-weight:bold
    style FaraiFlow fill:#036980,font-size:20px,font-weight:bold
    style Storage fill:#036980,font-size:20px,font-weight:bold
    style MunyaUI fill:#8ECBD6,font-size:16px,font-weight:bold
    style MunyaAPI fill:#8ECBD6,font-size:16px,font-weight:bold
    style FaraiUI fill:#8ECBD6,font-size:16px,font-weight:bold
    style FaraiAPI fill:#8ECBD6,font-size:16px,font-weight:bold
    style DB fill:#8ECBD6,font-size:16px,font-weight:bold
```

# Data Model Reference

## Account Types

### Exchange Accounts (neo4jNode:Account)

Exchange accounts exist in searchSpace and can close loops with other accounts. They represent current assets and current liabilities.

| Type | Description |
|------|-------------|
| **PERSONAL** | • Created with membership (one per member, required)<br>• For purchase/sale transactions and gifts |
| **OPERATIONS** | • Business accounts, shared accounts<br>• Created by Hustlers and above<br>• For purchase/sale transactions and gifts |
| **TRUST** | • Audited bank or vault accounts<br>• Created and managed by Treasurers |

### Internal Accounts (neo4jNode:AccountInternal)

Internal accounts are created and managed by members but are not added to searchSpace and do not close loops with other accounts.

| Type | Description |
|------|-------------|
| **CONSUMPTION** | • Used when an asset's value is consumed by a member<br>• Or within an economic process leading to consumption |
| **PRODUCTION** | • Used when value is created or enhanced by a member<br>• Or within an economic process directed by members |
| **DIGITAL_ASSET** | • Real asset whose complete value is stored digitally<br>• Can be duplicated without altering the original<br>• Value derived without altering the original<br>• Audit is redundant (data IS the asset) |
| **PHYSICAL_ASSET** | • Digital representation of physical assets<br>• Cannot be duplicated without altering the original<br>• Value derived without altering the original<br>• Can be audited to confirm data matches physical assets |

## AssetMarker (neo4jNode:AssetMarker)

An AssetMarker is both an Asset and a General Ledger entry.

### Dual Nature of AssetMarkers

| As an Asset | As a General Ledger Entry |
|-------------|---------------------------|
| • Small assets (up to 2kb) stored directly on node<br>• Larger assets reference S3 bucket data<br>• S3 data accessed/decrypted using AssetMarker node data | • Connected to one account with CR (credit) relationship<br>• Connected to another account with DR (debit) relationship |

### AssetMarker Relationships

**USED_IN Relationship**
```
(:AssetMarker { filename: "profile_pic_original.jpg" })-[:USED_IN]->(:AssetMarker { filename: "profile_pic_200.jpg" })
```

**Reference Relationships**
```
(:Member|Account|AccountInternal)-[:PROFILE_PIC_200_JPG]->(:AssetMarker)
```

## Invoice (neo4jNode::Invoice)

A credex template that directs the creation of the credex and associated accounting entries for the counterparties.

```
(:Account)<-[:DEBITS_TO]-(:Invoice)-[:CREDITS_TO]->(:AccountInternal),
(:Invoice)<-[:EXECUTES]-(:Credex)
```

# API Reference

## Member Endpoints

### /editMember
Parameters:
- `firstname`: string
- `lastname`: string
- `memberHandle`: string
- `profile_picture_200_jpg`: string - ID of node to link with PROFILE_PICTURE_200_JPG relationship
- `profile_picture_600_jpg`: string - Same as above
- `profile_picture_original_jpg`: string - Same as above
- `vendorBio`: string

### /sellInMarket
Operations:
- Sets `(:Member { vendor: true|false })`
- When set to true, creates if not existing:
  - `(:accountInternal { accountName: "Onboarded Assets", accountType: "PRODUCTION" })`
  - `(:accountInternal { accountName: "Profile Pictures", accountType: "DIGITAL_ASSET" })`

## Account Endpoints

### /editAccount
Parameters:
- `accountName`: string
- `accountHandle`: string
- `defaultDenom`: string - Limited to current denoms

### /createAccountInternal
Parameters:
- `accountName`: string
- `defaultDenom`: string - Limited to current denoms
- `accountType`: string - One of CONSUMPTION, PRODUCTION, DIGITAL_ASSET, PHYSICAL_ASSET

### /editAccountInternal
Parameters:
- `accountName`: string
- `defaultDenom`: string - Limited to current denoms

### /deleteAccountInternal
Parameters:
- `accountID`: string

## AssetMarker Endpoints

### /addAssetMarker
Parameters:
- `assetName`: string
- Arbitrary key/value pairs and/or neo4j-safed objects up to max size of 2kb
- Optional link/key to access any data stored in S3 bucket
- `AssetMarkerData`: Object - Data for AssetMarkers created when a connected credex is accepted

### /uploadAndOptimizeJpg
Parameters:
- Requires jpg, name, DR accountID, optional CR accountID (default MERGE "Onboarded Assets")

Operations:
- Saves AssetMarker with CR and DR relationships
- Creates 200px and 600px versions with the same CR and DR relationships
- Creates USED_IN relationship from original upload to resized/optimized images

### /connectAsset
Parameters:
- `assetID`: string
- `connectedID`: string - ID of node to connect
- `relName`: string - One of [:USED_IN|PROFILE_PIC_ORIGINAL_JPG|PROFILE_PIC_200_JPG|PROFILE_PIC_600_JPG]

### /disconnectAsset
Parameters:
- `assetID`: string
- `connectedID`: string - ID of node to disconnect
- `relName`: string - One of [:USED_IN|PROFILE_PIC_ORIGINAL_JPG|PROFILE_PIC_200_JPG|PROFILE_PIC_600_JPG]

## Invoice Endpoints

### /generateInvoice
Parameters:
- `payment accountID`: string - Account
- `AssetMarkerData`: Object - Data for AssetMarkers created when a connected credex is accepted

Returns:
- Link based on invoiceID for client to generate invoiceQR

# User Interface Specifications

## Vendor Screens

### Edit Member Profile
- **Sell in VimbisoMarket toggle**
  - Hits `/sellInMarket` with true|false
  - When false, all fields below are read-only
- **Profile Information**
  - Profile picture
  - Profile pic add button (triggers `/uploadAndOptimizeJpg` then `/connectAsset`)
  - First name (short text)
  - Last name (short text)
  - Member handle (short text)
  - Vendor bio (long text)
- **Save button** - Hits `/editMember` with text fields

### Vimbiso Store
- **Open Store and Broadcast Location** button
- **Create Credex Invoice** section
  - Item | Amount table
    - Tomatoes | fill box
    - Peanut Butter | fill box
    - Other Account | fill box
    - Up to 10 accounts total
  - Total: $total
- **Generate Credex Invoice QR** button - Hits `/generateInvoice`
- **Manage My Store** button

### Manage My Store
- **Inventory Accounts** section
  - Add and edit accounts for items you sell
  - Can be single items (e.g., "2018 Toyota") or flows of items (e.g., "Fresh Tomatoes")
- **Controls**
  - Add Account button
  - Adjust Balances button
  - List of Accounts and Balances, totaled at the bottom
  - Tap an account to view/edit

### Manage Account
- **Account Name** with edit button
- **Media**
  - Photos with remove/delete buttons (hit `/disconnectAsset`)
  - Add photo button (triggers `/uploadAndOptimizeJpg` then `/connectAsset`)
- **Details**
  - Account/Item Description (long text)
  - List of most recent 10 transactions in the account
- **Controls**
  - **Save** button
  - **Adjust Balances** button

### Adjusting Entry
Use to set starting balances, account for spoilage or loss, or any other change in value of inventory assets held.

| Credit Accounts | Amount |
|-----------------|--------|
| Tomatoes | fill box |
| Peanut Butter | fill box |
| **Total Credits** | $total |

| Debit Accounts | Amount |
|----------------|--------|
| Onboarded Assets | fill box |
| PRODUCTION accounts | fill box |
| CONSUMPTION accounts | fill box |
| **Total Debits** | $total |

*Totals must match*

- **Adjust Account Values** button - Hits `/addAssetMarker`
- **Back to Accounts** button

## Purchaser Screens

### Offer Credex
- Read-only offerCredex screen
- Values (including list of accounts and amounts) filled out based on invoice QR scanned
- **Offer Credex** button

### Search Screen
Search near me for items, stores, and vendors:
- Search box
- Map box with near me and results
- List of results (clicks to view Item, Store, Vendor pages)

### Store (Account) Page
- Account name
- Photo
- Description

### Vendor (Member) Page
- Name
- Member role
- Profile photo
- Vendor bio
