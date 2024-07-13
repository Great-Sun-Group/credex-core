import { ledgerSpaceDriver, searchSpaceDriver } from "../../../config/neo4j";

export async function LoopFinder(
  issuerAccountID: string,
  credexID: string,
  credexAmount: number,
  Denomination: string,
  CXXmultiplier: number,
  credexSecuredDenom: string,
  credexDueDate: string,
  acceptorAccountID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  var searchOwesType = "FLOATING";
  if (credexSecuredDenom != "floating") {
    searchOwesType = credexSecuredDenom + "_ANCHORED";

    //this is a bit of a hack for anchored credexes, assigning them a due date of today
    //as per daynode, so that they can be processed through the loopfinder and will be
    //prioritized by oldest outstanding credex
    const getDaynodeDate = await ledgerSpaceSession.run(`
      MATCH (daynode:DayNode {Active: true})
      RETURN daynode.Date AS today
      `);
    credexDueDate = getDaynodeDate.records[0].get("today");
  }

  //check if credex already exists in DB
  //this happens if the loopfinder overloads the processors or otherwise fails and
  //doesn't mark the credex as processed in ledgerSpace
  //in this case, we don't want to recreate the credex, just run the loopfinder.
  const checkCredexExists = await searchSpaceSession.run(
    `
      OPTIONAL MATCH (credex:Credex {credexID: $credexID})
      RETURN credex IS NOT NULL AS credexExists
    `,
    { credexID }
  );
  const credexExists = checkCredexExists.records[0].get("credexExists");

  //if the credex doesn't exist in searchSpace, create it
  if (!credexExists) {
    try {
      const createSearchSpaceCredex = await searchSpaceSession.run(
        `
        MATCH (issuer:Account {accountID: $issuerAccountID})
        MATCH (acceptor:Account {accountID: $acceptorAccountID})
        MERGE (issuer)-[:${searchOwesType}]->(searchOwesType:${searchOwesType})-[:${searchOwesType}]->(acceptor)
          ON CREATE SET searchOwesType.searchAnchorID = randomUUID()
        CREATE (searchOwesType)<-[:SEARCH_ANCHORED]-(credex:Credex {
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
          issuerAccountID: issuerAccountID,
          acceptorAccountID: acceptorAccountID,
          credexID: credexID,
          credexAmount: credexAmount,
          Denomination: Denomination,
          CXXmultiplier: CXXmultiplier,
          credexDueDate: credexDueDate,
          searchOwesType: searchOwesType,
        }
      );

      if (createSearchSpaceCredex.records.length === 0) {
        console.log("Unable to create SearchSpace credex");
        console.log("issuerAccountID: " + issuerAccountID);
        console.log("acceptorAccountID: " + acceptorAccountID);
        console.log("credexID: " + credexID);
        console.log("credexAmount: " + credexAmount);
        console.log("Denomination: " + Denomination);
        console.log("CXXmultiplier: " + CXXmultiplier);
        console.log("credexDueDate: " + credexDueDate);
        console.log("searchOwesType: " + searchOwesType);
        return false;
      }
      console.log(
        "Credex created in SearchSpace: " +
          createSearchSpaceCredex.records[0].get("credexID")
      );
    } catch (error) {
      console.error("Error creating SearchSpace credex:", error);
      return false;
    }
  } else {
    console.log("credex already exists in SearchSpace: " + credexID);
  }

  let searchForCredloops = true;
  while (searchForCredloops) {
    console.log("searching for credloops...");
    const searchSpaceQuery = await searchSpaceSession.run(
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
      MATCH (loopNode)<-[:SEARCH_ANCHORED]-(credex:Credex)
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

    if (searchSpaceQuery.records.length > 0) {
      const valueToClear = searchSpaceQuery.records[0].get("lowestAmount");
      const credexesInLoop = searchSpaceQuery.records[0].get("credexIDs");
      const credexesRedeemed = searchSpaceQuery.records[0].get("zeroCredexIDs");
      console.log("credexesInLoop:");
      console.log(credexesInLoop);
      console.log("credexesRedeemed:");
      console.log(credexesRedeemed);

      const cleanupQuery = await searchSpaceSession.run(
        `
        // Step 10: Delete zeroCredexes
        UNWIND $credexesRedeemed AS credexRedeemedID
        MATCH (credex:Credex {credexID: credexRedeemedID})-[:SEARCH_ANCHORED]->(searchAnchor)
        DETACH DELETE credex
        WITH DISTINCT searchAnchor

        // Step 11: Handle orphaned searchAnchors
        OPTIONAL MATCH (searchAnchor)<-[:SEARCH_ANCHORED]-(otherCredex:Credex)
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

      console.log(
        "credloop of " +
          valueToClear +
          " CXX found and cleared, now updating ledgerSpace"
      );

      const ledgerSpaceQuery = await ledgerSpaceSession.run(
        `
          MATCH (daynode:DayNode {Active: true})
          CREATE (loopAnchor:LoopAnchor {
              loopedAt: DateTime(),
              loopID: randomUUID(),
              LoopedAmount: $valueToClear,
              CXXmultiplier: 1,
              Denomination: "CXX"
          })-[to_daynode:LOOPED_ON]->(daynode)
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
      console.log(
        "loopAnchor created: " + ledgerSpaceQuery.records[0].get("loopID")
      );
    } else {
      // if no credloops found this iteration
      const markCredexAsProcessed = await ledgerSpaceSession.run(
        `
          MATCH (processedCredex:Credex {credexID: $credexID})
          SET processedCredex.queueStatus = "PROCESSED"
          RETURN processedCredex.credexID AS credexID
      `,
        { credexID }
      );

      console.log("...none. credex marked processed");

      searchForCredloops = false;
    }
  }

  return true;
}

/*

const transformIntegers = (val: number) =>
  neo4j.isInt(val)
    ? neo4j.integer.inSafeRange(val)
      ? val.toNumber()
      : val.toString()
    : val;


        //create notifications for each account
        var notiFeedDataQuery = await ledgerSpaceSession.run(`
            MATCH (loopAnchor:LoopAnchor{loopID:$loopID})<-[:REDEEMED]-(everyLoopedCredex:Credex)-[:OWES|CLEARED]->(NotiAccount:Account)
            
            MATCH (NotiAccount)-[:OWES|CLEARED]->(payableCredex:Credex)-[redeemedPayable:REDEEMED]->(loopAnchor), (payableCredex:Credex)-[:OWES|CLEARED]->(payableAccount:Account)
            
            MATCH (NotiAccount)<-[:OWES|CLEARED]-(receivableCredex:Credex)-[redeemedReceivable:REDEEMED]->(loopAnchor), (receivableCredex:Credex)<-[:OWES|CLEARED]-(receivableAccount:Account)
            
            RETURN
              NotiAccount.accountID AS notiAccountID,
              redeemedPayable.AmountRedeemed AS payableRedeemed,
              redeemedPayable.Denomination AS payableDenom,
              redeemedPayable.CXXmultiplier AS payableCXXmult,
              payableAccount.firstname AS payableAccountFirstname,
              payableAccount.lastname AS payableAccountLastname,
              redeemedReceivable.AmountRedeemed AS receivableRedeemed,
              redeemedReceivable.Denomination AS receivableDenom,
              redeemedReceivable.CXXmultiplier AS receivableCXXmult,
              receivableAccount.firstname AS receivableAccountFirstname,
              receivableAccount.lastname AS receivableAccountLastname
  
            `,
          {
            loopID: loopID
          }
        )
        for (let notiIndex = 0; notiIndex < notiFeedDataQuery.records.length; notiIndex++) {
          var notiData = notiFeedDataQuery.records[notiIndex];

          var notiAccountID = notiData.get("notiAccountID")
          var amountPayableCXX = notiData.get("payableRedeemed")
          var payableDenom = notiData.get("payableDenom")
          var payableCXXmult = notiData.get("payableCXXmult")
          var payableAccountFirstname = notiData.get("payableAccountFirstname")
          var payableAccountLastname = notiData.get("payableAccountLastname")
          var amountReceivableCXX = notiData.get("receivableRedeemed")
          var receivableDenom = notiData.get("receivableDenom")
          var receivableCXXmult = notiData.get("receivableCXXmult")
          var receivableAccountFirstname = notiData.get("receivableAccountFirstname")
          var receivableAccountLastname = notiData.get("receivableAccountLastname")

          //get denom data based on denom code for each
          var payableDenomData = getDenoms({ 'code': payableDenom });
          var receivableDenomData = getDenoms({ 'code': receivableDenom });
          var payableDenomDataFull = {
            code: payableDenom,
            fulldescription: payableDenomData.fulldescription,
            rate: payableCXXmult,
            regionalization: payableDenomData.regionalization,
            type: payableDenomData.type
          };
          var receivableDenomDataFull = {
            code: receivableDenom,
            fulldescription: receivableDenomData.fulldescription,
            rate: receivableCXXmult,
            regionalization: receivableDenomData.regionalization,
            type: receivableDenomData.type
          };

          //convert and format amounts
          var amountPayableFormatted = denomAmountProcessor(amountPayableCXX, payableDenomDataFull, payableDenomDataFull)
          var amountReceivableFormatted = denomAmountProcessor(amountReceivableCXX, receivableDenomDataFull, receivableDenomDataFull)

          var notiFeedText = amountPayableFormatted + " that you owed to " + payableAccountFirstname + " " + payableAccountLastname + " has been credlooped against " + amountReceivableFormatted + " that " + receivableAccountFirstname + " " + receivableAccountLastname + " owed you.";


          console.log(notiAccountID)
          console.log(notiFeedText)

          //push noti to account
          var rest = new Ably.Rest({ key: process.env.ABLY_API_KEY });
          var channel = rest.channels.get('credex-user-' + notiAccountID);

          channel.publish('user-notification', JSON.stringify({ notiAccountID: null, message: notiFeedText }));

          channel.publish('update-user', "refresh data after loop");
        }
      */
