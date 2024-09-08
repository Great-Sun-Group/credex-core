"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoopFinder = LoopFinder;
const neo4j_1 = require("../../../config/neo4j");
const logger_1 = __importDefault(require("../../../config/logger"));
async function LoopFinder(issuerAccountID, credexID, credexAmount, Denomination, CXXmultiplier, credexSecuredDenom, credexDueDate, acceptorAccountID) {
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    const searchSpaceSession = neo4j_1.searchSpaceDriver.session();
    try {
        const searchOwesType = getSearchOwesType(credexSecuredDenom);
        credexDueDate = await adjustCredexDueDate(ledgerSpaceSession, credexSecuredDenom, credexDueDate);
        await createOrUpdateSearchSpaceCredex(searchSpaceSession, issuerAccountID, acceptorAccountID, credexID, credexAmount, Denomination, CXXmultiplier, credexDueDate, searchOwesType);
        let searchForCredloops = true;
        while (searchForCredloops) {
            logger_1.default.info("Searching for credloops...");
            const { valueToClear, credexesInLoop, credexesRedeemed } = await findCredloop(searchSpaceSession, issuerAccountID, searchOwesType);
            if (credexesInLoop.length > 0) {
                await processCredloop(ledgerSpaceSession, searchSpaceSession, valueToClear, credexesInLoop, credexesRedeemed);
            }
            else {
                await markCredexAsProcessed(ledgerSpaceSession, credexID);
                logger_1.default.info("No credloops found. Credex marked as processed.");
                searchForCredloops = false;
            }
        }
        return true;
    }
    catch (error) {
        logger_1.default.error("Error in LoopFinder:", error);
        return false;
    }
    finally {
        await ledgerSpaceSession.close();
        await searchSpaceSession.close();
    }
}
function getSearchOwesType(credexSecuredDenom) {
    return credexSecuredDenom !== "floating" ? `${credexSecuredDenom}_SECURED` : "FLOATING";
}
async function adjustCredexDueDate(session, credexSecuredDenom, credexDueDate) {
    if (credexSecuredDenom !== "floating") {
        const result = await session.run(`
      MATCH (daynode:Daynode {Active: true})
      RETURN daynode.Date AS today
    `);
        return result.records[0].get("today");
    }
    return credexDueDate;
}
async function createOrUpdateSearchSpaceCredex(session, issuerAccountID, acceptorAccountID, credexID, credexAmount, Denomination, CXXmultiplier, credexDueDate, searchOwesType) {
    const credexExists = await checkCredexExists(session, credexID);
    if (!credexExists) {
        await createSearchSpaceCredex(session, issuerAccountID, acceptorAccountID, credexID, credexAmount, Denomination, CXXmultiplier, credexDueDate, searchOwesType);
    }
    else {
        logger_1.default.info(`Credex already exists in SearchSpace: ${credexID}`);
    }
}
async function checkCredexExists(session, credexID) {
    const result = await session.run(`
    OPTIONAL MATCH (credex:Credex {credexID: $credexID})
    RETURN credex IS NOT NULL AS credexExists
    `, { credexID });
    return result.records[0].get("credexExists");
}
async function createSearchSpaceCredex(session, issuerAccountID, acceptorAccountID, credexID, credexAmount, Denomination, CXXmultiplier, credexDueDate, searchOwesType) {
    try {
        const result = await session.run(`
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
      `, {
            issuerAccountID,
            acceptorAccountID,
            credexID,
            credexAmount,
            Denomination,
            CXXmultiplier,
            credexDueDate,
            searchOwesType,
        });
        if (result.records.length === 0) {
            throw new Error("Unable to create SearchSpace credex");
        }
        logger_1.default.info(`Credex created in SearchSpace: ${result.records[0].get("credexID")}`);
    }
    catch (error) {
        logger_1.default.error("Error creating SearchSpace credex:", error);
        throw error;
    }
}
async function findCredloop(session, issuerAccountID, searchOwesType) {
    const result = await session.run(`
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
    `, { issuerAccountID, searchOwesType });
    if (result.records.length > 0) {
        return {
            valueToClear: result.records[0].get("lowestAmount").toNumber(),
            credexesInLoop: result.records[0].get("credexIDs"),
            credexesRedeemed: result.records[0].get("zeroCredexIDs")
        };
    }
    return { valueToClear: 0, credexesInLoop: [], credexesRedeemed: [] };
}
async function processCredloop(ledgerSpaceSession, searchSpaceSession, valueToClear, credexesInLoop, credexesRedeemed) {
    logger_1.default.info("Credexes in loop:", credexesInLoop);
    logger_1.default.info("Credexes redeemed:", credexesRedeemed);
    await cleanupSearchSpace(searchSpaceSession, credexesRedeemed);
    await updateLedgerSpace(ledgerSpaceSession, valueToClear, credexesInLoop, credexesRedeemed);
}
async function cleanupSearchSpace(session, credexesRedeemed) {
    await session.run(`
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
    `, { credexesRedeemed });
}
async function updateLedgerSpace(session, valueToClear, credexesInLoop, credexesRedeemed) {
    logger_1.default.info(`Credloop of ${valueToClear} CXX found and cleared, now updating ledgerSpace`);
    const result = await session.run(`
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
    `, { valueToClear, credexesInLoop, credexesRedeemed });
    logger_1.default.info(`LoopAnchor created: ${result.records[0].get("loopID")}`);
}
async function markCredexAsProcessed(session, credexID) {
    await session.run(`
    MATCH (processedCredex:Credex {credexID: $credexID})
    SET processedCredex.queueStatus = "PROCESSED"
    RETURN processedCredex.credexID AS credexID
    `, { credexID });
}
// TODO: Implement notification system
/*
async function createNotifications(session: Session, loopID: string): Promise<void> {
  // Implementation for creating notifications
}
*/
//# sourceMappingURL=LoopFinder.js.map