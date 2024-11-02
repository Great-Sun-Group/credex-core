import { ledgerSpaceDriver, searchSpaceDriver } from "../../../config/neo4j";
import * as neo4j from "neo4j-driver";
import logger from "../../utils/logger";

export async function LoopFinder(
  issuerAccountID: string,
  credexID: string,
  credexAmount: number,
  Denomination: string,
  CXXmultiplier: number,
  credexSecuredDenom: string,
  credexDueDate: string,
  acceptorAccountID: string
): Promise<boolean> {
  logger.info("LoopFinder started", {
    issuerAccountID,
    credexID,
    Denomination,
    credexSecuredDenom,
  });
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  try {
    const searchOwesType = getSearchOwesType(credexSecuredDenom);
    credexDueDate = await adjustCredexDueDate(
      ledgerSpaceSession,
      credexSecuredDenom,
      credexDueDate
    );

    await createOrUpdateSearchSpaceCredex(
      searchSpaceSession,
      issuerAccountID,
      acceptorAccountID,
      credexID,
      credexAmount,
      Denomination,
      CXXmultiplier,
      credexDueDate,
      searchOwesType
    );

    let searchForCredloops = true;
    while (searchForCredloops) {
      logger.debug("Searching for credloops...");
      const { valueToClear, credexesInLoop, credexesRedeemed } =
        await findCredloop(searchSpaceSession, issuerAccountID, searchOwesType);

      if (credexesInLoop.length > 0) {
        await processCredloop(
          ledgerSpaceSession,
          searchSpaceSession,
          valueToClear,
          credexesInLoop,
          credexesRedeemed
        );
      } else {
        await markCredexAsProcessed(ledgerSpaceSession, credexID);
        logger.info("No credloops found. Credex marked as processed.", {
          credexID,
        });
        searchForCredloops = false;
      }
    }

    logger.info("LoopFinder completed successfully", { credexID });
    return true;
  } catch (error) {
    logger.error("Error in LoopFinder", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID,
    });
    return false;
  } finally {
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
  }
}

function getSearchOwesType(credexSecuredDenom: string): string {
  return credexSecuredDenom !== "floating"
    ? `${credexSecuredDenom}_SECURED`
    : "UNSECURED";
}

async function adjustCredexDueDate(
  session: neo4j.Session,
  credexSecuredDenom: string,
  credexDueDate: string
): Promise<string> {
  logger.debug("Adjusting credex due date", {
    credexSecuredDenom,
    credexDueDate,
  });
  if (credexSecuredDenom !== "floating") {
    const result = await session.run(`
      MATCH (daynode:Daynode {Active: true})
      RETURN daynode.Date AS today
    `);
    return result.records[0].get("today");
  }
  return credexDueDate;
}

async function createOrUpdateSearchSpaceCredex(
  session: neo4j.Session,
  issuerAccountID: string,
  acceptorAccountID: string,
  credexID: string,
  credexAmount: number,
  Denomination: string,
  CXXmultiplier: number,
  credexDueDate: string,
  searchOwesType: string
): Promise<void> {
  logger.debug("Creating or updating SearchSpace credex", {
    credexID,
    Denomination,
    searchOwesType,
  });
  const credexExists = await checkCredexExists(session, credexID);

  if (!credexExists) {
    await createSearchSpaceCredex(
      session,
      issuerAccountID,
      acceptorAccountID,
      credexID,
      credexAmount,
      Denomination,
      CXXmultiplier,
      credexDueDate,
      searchOwesType
    );
  } else {
    logger.info("Credex already exists in SearchSpace", { credexID });
  }
}

async function checkCredexExists(
  session: neo4j.Session,
  credexID: string
): Promise<boolean> {
  logger.debug("Checking if credex exists", { credexID });
  const result = await session.run(
    `
    OPTIONAL MATCH (credex:Credex {credexID: $credexID})
    RETURN credex IS NOT NULL AS credexExists
    `,
    { credexID }
  );
  return result.records[0].get("credexExists");
}

async function createSearchSpaceCredex(
  session: neo4j.Session,
  issuerAccountID: string,
  acceptorAccountID: string,
  credexID: string,
  credexAmount: number,
  Denomination: string,
  CXXmultiplier: number,
  credexDueDate: string,
  searchOwesType: string
): Promise<void> {
  logger.debug("Creating SearchSpace credex", {
    credexID,
    Denomination,
    searchOwesType,
  });
  try {
    const result = await session.run(
      `
      MATCH (issuer:Account {accountID: $issuerAccountID})
      MATCH (acceptor:Account {accountID: $acceptorAccountID})
      MERGE (issuer)-[:${searchOwesType}]->(searchOwesType:${searchOwesType})-[:${searchOwesType}]->(acceptor)
        ON CREATE SET searchOwesType.searchAnchorID = randomUUID()
      CREATE (searchOwesType)<-[:SEARCH_SECURED]-(credex:Credex {
          credexID: $credexID,
          outstandingAmount: $credexAmount,
          Denomination: $Denomination,
          CXXmultiplier: $CXXmultiplier,
          dueDate: date($credexDueDate)
      })
      WITH searchOwesType, credex
      CALL apoc.do.case(
          [
              searchOwesType.earliestDueDate IS NULL
              OR searchOwesType.earliestDueDate > date($credexDueDate), 
              'SET searchOwesType.earliestDueDate = date($credexDueDate) RETURN true'
          ],
          'RETURN false',
          {
            searchOwesType: searchOwesType,
            credexDueDate: credex.dueDate
          }
      ) YIELD value
      RETURN credex.credexID AS credexID
      `,
      {
        issuerAccountID,
        acceptorAccountID,
        credexID,
        credexAmount,
        Denomination,
        CXXmultiplier,
        credexDueDate,
        searchOwesType,
      }
    );

    if (result.records.length === 0) {
      throw new Error("Unable to create SearchSpace credex");
    }

    logger.info("Credex created in SearchSpace", {
      credexID: result.records[0].get("credexID"),
    });
  } catch (error) {
    logger.error("Error creating SearchSpace credex", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID,
    });
    throw error;
  }
}

async function findCredloop(
  session: neo4j.Session,
  issuerAccountID: string,
  searchOwesType: string
): Promise<{
  valueToClear: number;
  credexesInLoop: string[];
  credexesRedeemed: string[];
}> {
  logger.debug("Finding credloop", { issuerAccountID, searchOwesType });
  const result = await session.run(
    `
    // Step 1: Find all loops starting and ending at the specified account, with the specified searchOwesType
    MATCH credloops = (issuer:Account {accountID: $issuerAccountID})-[:${searchOwesType}*]->(issuer)
    
    WITH credloops, nodes(credloops) AS loopNodes
    UNWIND loopNodes AS node
    WITH credloops, node
    WITH credloops, MIN(node.earliestDueDate) AS earliestDueDate

    // Step 3: Filter loops to include only those containing a node with the earliest earliestDueDate
    WITH credloops, earliestDueDate, nodes(credloops) AS loopNodes
    UNWIND loopNodes AS node
    WITH credloops, node
    WHERE node.earliestDueDate = earliestDueDate
    WITH credloops, length(credloops) AS loopLength

    // Step 4: Return only the longest loop, breaking ties with rand()
    ORDER BY loopLength DESC, rand()
    LIMIT 1
    WITH nodes(credloops) AS credloopNodes

    // Step 5: Each node returns the credex it is connected to with the earliest dueDate
    // on tie, credex with largest amount
    UNWIND credloopNodes AS loopNode
    MATCH (loopNode)<-[:SEARCH_SECURED]-(credex:Credex)
    WITH loopNode, collect(credex) AS credexList
    WITH 
           reduce(minCredex = credexList[0], c IN credexList | 
                  CASE 
                    WHEN c.dueDate < minCredex.dueDate THEN c
                    WHEN c.dueDate = minCredex.dueDate AND c.outstandingAmount > minCredex.outstandingAmount THEN c
                    ELSE minCredex 
                  END) AS earliestCredex
    WITH collect(earliestCredex) AS finalCredexes, COLLECT(earliestCredex.credexID) AS credexIDs

    // Step 6: Identify the minimum outstandingAmount and subtract it from all credexes
    UNWIND finalCredexes AS credexInLoop
    WITH finalCredexes, min(credexInLoop.outstandingAmount) AS lowestAmount, credexIDs

    UNWIND finalCredexes AS credex
    SET credex.outstandingAmount = credex.outstandingAmount - lowestAmount

    // Step 7: Collect all credexes and filter those with outstandingAmount = 0.
    WITH lowestAmount, COLLECT(credex) AS allCredexes, credexIDs
    WITH lowestAmount, allCredexes, [credex IN allCredexes WHERE credex.outstandingAmount = 0] AS zeroCredexes, credexIDs

    //Step 8: collect credexIDs of the zeroCredexes
    UNWIND zeroCredexes as zeroCredex
    RETURN collect(zeroCredex.credexID) AS zeroCredexIDs, lowestAmount, credexIDs
    `,
    { issuerAccountID, searchOwesType }
  );

  if (result.records.length > 0) {
    const valueToClear = result.records[0].get("lowestAmount").toNumber();
    const credexesInLoop = result.records[0].get("credexIDs");
    const credexesRedeemed = result.records[0].get("zeroCredexIDs");
    logger.info("Credloop found", {
      valueToClear,
      credexesInLoopCount: credexesInLoop.length,
      credexesRedeemedCount: credexesRedeemed.length,
    });
    return { valueToClear, credexesInLoop, credexesRedeemed };
  }

  logger.info("No credloop found");
  return { valueToClear: 0, credexesInLoop: [], credexesRedeemed: [] };
}

async function processCredloop(
  ledgerSpaceSession: neo4j.Session,
  searchSpaceSession: neo4j.Session,
  valueToClear: number,
  credexesInLoop: string[],
  credexesRedeemed: string[]
): Promise<void> {
  logger.info("Processing credloop", {
    valueToClear,
    credexesInLoopCount: credexesInLoop.length,
    credexesRedeemedCount: credexesRedeemed.length,
  });

  await cleanupSearchSpace(searchSpaceSession, credexesRedeemed);
  await updateLedgerSpace(
    ledgerSpaceSession,
    valueToClear,
    credexesInLoop,
    credexesRedeemed
  );
}

async function cleanupSearchSpace(
  session: neo4j.Session,
  credexesRedeemed: string[]
): Promise<void> {
  logger.debug("Cleaning up SearchSpace", {
    credexesRedeemedCount: credexesRedeemed.length,
  });
  await session.run(
    `
    // Step 10: Delete zeroCredexes
    UNWIND $credexesRedeemed AS credexRedeemedID
    MATCH (credex:Credex {credexID: credexRedeemedID})-[:SEARCH_SECURED]->(searchAnchor)
    DETACH DELETE credex
    WITH DISTINCT searchAnchor

    // Step 11: Handle orphaned searchAnchors
    OPTIONAL MATCH (searchAnchor)<-[:SEARCH_SECURED]-(otherCredex:Credex)
    WITH searchAnchor, collect(otherCredex) AS otherCredexes
    CALL apoc.do.when(
      size(otherCredexes) = 0,
      'DETACH DELETE searchAnchor RETURN "searchAnchorDeleted" AS result',
      'RETURN "noChanges" AS result',
      {searchAnchor: searchAnchor}
    ) YIELD value AS deleteValue
    WITH deleteValue, searchAnchor, otherCredexes
    WHERE deleteValue <> "searchAnchorDeleted"

    // Step 12: Update earliestDueDate on remaining searchAnchors
    UNWIND otherCredexes AS otherCredex
    WITH DISTINCT searchAnchor, otherCredex
    CALL apoc.do.when(
      (searchAnchor.earliestDueDate IS NULL OR searchAnchor.earliestDueDate > date(otherCredex.dueDate)),
      'SET searchAnchor.earliestDueDate = date(otherCredex.dueDate) RETURN "searchAnchorEarliestUpdated" AS result',
      'RETURN "noChanges" AS result',
      {searchAnchor: searchAnchor, otherCredex: otherCredex}
    ) YIELD value AS updateValue
    RETURN searchAnchor
    `,
    { credexesRedeemed }
  );
  logger.debug("SearchSpace cleanup completed");
}

async function updateLedgerSpace(
  session: neo4j.Session,
  valueToClear: number,
  credexesInLoop: string[],
  credexesRedeemed: string[]
): Promise<void> {
  logger.info("Updating LedgerSpace", {
    valueToClear,
    credexesInLoopCount: credexesInLoop.length,
    credexesRedeemedCount: credexesRedeemed.length,
  });

  const result = await session.run(
    `
    MATCH (daynode:Daynode {Active: true})
    CREATE (loopAnchor:LoopAnchor {
        loopedAt: DateTime(),
        loopID: randomUUID(),
        LoopedAmount: $valueToClear,
        CXXmultiplier: 1,
        Denomination: "CXX"
    })-[to_daynode:CREATED_ON]->(daynode)
    WITH loopAnchor

    UNWIND $credexesInLoop AS credexID
    MATCH (thisCredex:Credex {credexID: credexID})
    SET thisCredex.OutstandingAmount = thisCredex.OutstandingAmount - $valueToClear,
        thisCredex.RedeemedAmount = thisCredex.RedeemedAmount + $valueToClear
    WITH thisCredex, loopAnchor
    CREATE (thisCredex)-[:REDEEMED {
        AmountRedeemed: $valueToClear,
        AmountOutstandingNow: thisCredex.OutstandingAmount,
        Denomination: thisCredex.Denomination,
        CXXmultiplier: thisCredex.CXXmultiplier,
        createdAt: DateTime(),
        redeemedRelID: randomUUID()
    }]->(loopAnchor)

    WITH thisCredex, loopAnchor
    MATCH (loopAnchor)<-[:REDEEMED]-(thisCredex)
      -[:OWES]->(:Account)-[:OWES]->(nextCredex:Credex)
      -[:REDEEMED]->(loopAnchor)
    CREATE (thisCredex)-[:CREDLOOP {
        AmountRedeemed: $valueToClear,
        AmountOutstandingNow: thisCredex.OutstandingAmount,
        Denomination: thisCredex.Denomination,
        CXXmultiplier: thisCredex.CXXmultiplier,
        createdAt: DateTime(),
        loopID: loopAnchor.loopID,
        credloopRelID: randomUUID()
    }]->(nextCredex)

    WITH DISTINCT loopAnchor
    UNWIND $credexesRedeemed AS redeemedCredexID
    MATCH
      (owesOutAccount:Account)-[owes1:OWES]->
        (thisRedeemedCredex:Credex {credexID: redeemedCredexID})-[owes2:OWES]->
        (owesInAccount:Account),
      (thisRedeemedCredex)-[:REDEEMED]->(loopAnchor)
    CREATE
      (owesOutAccount)-[:CLEARED]->(thisRedeemedCredex)-[:CLEARED]->(owesInAccount)
    SET thisRedeemedCredex.DateRedeemed = DateTime()
    DELETE owes1, owes2

    RETURN DISTINCT loopAnchor.loopID AS loopID
    `,
    { valueToClear, credexesInLoop, credexesRedeemed }
  );

  logger.info("LedgerSpace update completed", {
    loopID: result.records[0].get("loopID"),
  });
}

async function markCredexAsProcessed(
  session: neo4j.Session,
  credexID: string
): Promise<void> {
  logger.debug("Marking credex as processed", { credexID });
  await session.run(
    `
    MATCH (processedCredex:Credex {credexID: $credexID})
    SET processedCredex.queueStatus = "PROCESSED"
    RETURN processedCredex.credexID AS credexID
    `,
    { credexID }
  );
  logger.debug("Credex marked as processed", { credexID });
}

// TODO: Implement notification system
/*
async function createNotifications(session: neo4j.Session, loopID: string): Promise<void> {
  // Implementation for creating notifications
}
*/
