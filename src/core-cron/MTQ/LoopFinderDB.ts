import * as neo4j from "neo4j-driver";
import logger from "../../utils/logger";
import { CredloopResult } from "./LoopFinderTypes";

export async function checkCredexExists(
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

export async function createSearchSpaceCredex(
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
        ON CREATE SET 
          searchOwesType.searchAnchorID = randomUUID(),
          searchOwesType.totalOutstandingCXX = 0,
          searchOwesType.totalOutstandingInDenom = 0,
          searchOwesType.denominationCode = $Denomination
      CREATE (searchOwesType)<-[:SEARCH_SECURED]-(credex:Credex {
          credexID: $credexID,
          outstandingAmount: $credexAmount,
          Denomination: $Denomination,
          CXXmultiplier: $CXXmultiplier,
          dueDate: date($credexDueDate)
      })
      WITH searchOwesType, credex
      SET 
        searchOwesType.totalOutstandingCXX = searchOwesType.totalOutstandingCXX + credex.outstandingAmount,
        searchOwesType.totalOutstandingInDenom = searchOwesType.totalOutstandingInDenom + (credex.outstandingAmount / credex.CXXmultiplier)
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

export async function findCredloop(
  session: neo4j.Session,
  issuerAccountID: string,
  searchOwesType: string
): Promise<CredloopResult> {
  logger.debug("Finding credloop", { issuerAccountID, searchOwesType });
  const result = await session.run(
    `
    // Find all loops starting and ending at the specified account
    MATCH credloops = (issuer:Account {accountID: $issuerAccountID})-[:${searchOwesType}*]->(issuer)
    WITH credloops, nodes(credloops) AS loopNodes
    
    // Get credexes in the loop
    UNWIND loopNodes AS loopNode
    MATCH (loopNode)<-[:SEARCH_SECURED]-(credex:Credex)
    WITH collect(credex) AS credexes
    
    // Find minimum amount
    WITH credexes,
         reduce(min = null, c IN credexes | 
           CASE
             WHEN min IS NULL THEN toInteger(c.outstandingAmount)
             WHEN toInteger(c.outstandingAmount) < min THEN toInteger(c.outstandingAmount)
             ELSE min
           END
         ) AS lowestAmount
    
    // Update amounts and identify zeroed credexes
    UNWIND credexes AS credex
    WITH credex, lowestAmount, credexes,
         toInteger(credex.outstandingAmount - lowestAmount) AS newAmount
    SET credex.outstandingAmount = newAmount
    
    WITH lowestAmount,
         collect(credex.credexID) AS credexIDs,
         collect(CASE WHEN newAmount = 0 THEN credex.credexID ELSE null END) AS zeroedIds
    
    RETURN 
      [id IN zeroedIds WHERE id IS NOT NULL] AS zeroCredexIDs,
      lowestAmount,
      credexIDs
    `,
    { issuerAccountID, searchOwesType }
  );

  if (result.records.length > 0) {
    const record = result.records[0];
    const lowestAmount = record.get("lowestAmount");
    // Handle both Neo4j Integer and regular number types
    const valueToClear = typeof lowestAmount?.toNumber === 'function' 
      ? lowestAmount.toNumber() 
      : Number(lowestAmount);

    const credexesInLoop = record.get("credexIDs");
    const credexesRedeemed = record.get("zeroCredexIDs");

    if (valueToClear === 0 || isNaN(valueToClear)) {
      logger.info("No valid amount to clear found");
      return { valueToClear: 0, credexesInLoop: [], credexesRedeemed: [] };
    }

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

export async function cleanupSearchSpace(
  session: neo4j.Session,
  credexesRedeemed: string[]
): Promise<void> {
  logger.debug("Cleaning up SearchSpace", {
    credexesRedeemedCount: credexesRedeemed.length,
  });

  await session.run(
    `
    // Delete zeroed credexes
    UNWIND $credexesRedeemed AS credexRedeemedID
    MATCH (credex:Credex {credexID: credexRedeemedID})-[:SEARCH_SECURED]->(searchAnchor)
    WHERE credex.outstandingAmount = 0
    DETACH DELETE credex
    WITH DISTINCT searchAnchor

    // Update searchAnchor totals
    OPTIONAL MATCH (searchAnchor)<-[:SEARCH_SECURED]-(remainingCredex:Credex)
    WITH searchAnchor,
         collect(remainingCredex) as remainingCredexes,
         sum(remainingCredex.outstandingAmount) as totalCXX,
         sum(remainingCredex.outstandingAmount / remainingCredex.CXXmultiplier) as totalDenom

    // Delete empty anchors or update totals
    CALL apoc.do.case([
      size(remainingCredexes) = 0,
      'DETACH DELETE searchAnchor RETURN "deleted" as result',
      true,
      'SET searchAnchor.totalOutstandingCXX = $totalCXX,
           searchAnchor.totalOutstandingInDenom = $totalDenom
       RETURN "updated" as result'
    ],
    '',
    {
      searchAnchor: searchAnchor,
      remainingCredexes: remainingCredexes,
      totalCXX: totalCXX,
      totalDenom: totalDenom
    }
    ) YIELD value
    RETURN value.result
    `,
    { credexesRedeemed }
  );
  logger.debug("SearchSpace cleanup completed");
}

export async function updateLedgerSpace(
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
    // Create loop anchor
    MATCH (daynode:Daynode {Active: true})
    CREATE (loopAnchor:LoopAnchor {
        loopedAt: DateTime(),
        loopID: randomUUID(),
        LoopedAmount: $valueToClear,
        CXXmultiplier: 1,
        Denomination: "CXX"
    })-[:CREATED_ON]->(daynode)
    WITH loopAnchor

    // Update credexes and create REDEEMED relationships
    UNWIND $credexesInLoop AS credexID
    MATCH (thisCredex:Credex {credexID: credexID})
    SET thisCredex.OutstandingAmount = thisCredex.OutstandingAmount - $valueToClear,
        thisCredex.RedeemedAmount = thisCredex.RedeemedAmount + $valueToClear
    CREATE (thisCredex)-[:REDEEMED {
        AmountRedeemed: $valueToClear,
        AmountOutstandingNow: thisCredex.OutstandingAmount,
        Denomination: thisCredex.Denomination,
        CXXmultiplier: thisCredex.CXXmultiplier,
        createdAt: DateTime(),
        redeemedRelID: randomUUID()
    }]->(loopAnchor)
    WITH collect(thisCredex) as credexesUpdated, loopAnchor

    // Create CREDLOOP relationships
    UNWIND credexesUpdated AS thisCredex
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

    // Handle zeroed credexes
    WITH DISTINCT loopAnchor
    UNWIND $credexesRedeemed AS redeemedCredexID
    MATCH
      (owesOutAccount:Account)-[owes1:OWES]->
        (thisRedeemedCredex:Credex {credexID: redeemedCredexID})-[owes2:OWES]->
        (owesInAccount:Account)
    WHERE thisRedeemedCredex.outstandingAmount = 0
    CREATE
      (owesOutAccount)-[:CLEARED]->(thisRedeemedCredex)-[:CLEARED]->(owesInAccount)
    DELETE owes1, owes2
    
    RETURN loopAnchor.loopID AS loopID
    `,
    { valueToClear, credexesInLoop, credexesRedeemed }
  );

  logger.info("LedgerSpace update completed", {
    loopID: result.records[0].get("loopID"),
  });
}

export async function markCredexAsProcessed(
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
