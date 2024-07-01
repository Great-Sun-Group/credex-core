    // Step 1: Find all the loops
    MATCH (issuer:Account {accountID: $issuerAccountID})
    MATCH (acceptor:Account {accountID: $acceptorAccountID})
    MERGE (issuer)-[:${searchOwesType}]->(searchOwesType:${searchOwesType})-[:${searchOwesType}]->(acceptor)
    CREATE (searchOwesType)<-[:IN_THIS_OWES_TYPE]-(credex:Credex {
        credexID: $credexID,
        outstandingAmount: $credexAmount,
        Denomination: $Denomination,
        CXXmultiplier: $CXXmultiplier,
        dueDate: date($credexDueDate)
    })
    WITH searchOwesType, credex
    CALL apoc.do.case(
        [
            searchOwesType.earliestDueDate < date($credexDueDate), 
            'SET searchOwesType.earliestDueDate = date($credexDueDate) RETURN true'
        ],
        '',
        {}
    ) YIELD value
    RETURN credex
