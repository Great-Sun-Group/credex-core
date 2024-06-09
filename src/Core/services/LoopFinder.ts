import { ledgerSpaceDriver, searchSpaceDriver } from "../../config/neo4j/neo4j";

export async function LoopFinder(
  issuerMemberID: string,
  credexID: string,
  credexAmount: number,
  credexDueDate: string,
  acceptorMemberID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  const createSearchSpaceCredex = await searchSpaceSession.run(
    `
      MATCH (issuer:Member {memberID: $issuerMemberID})
      MATCH (acceptor:Member {memberID: $acceptorMemberID})
      CREATE (issuer)-[credex:CREDEX {
        credexID: $credexID,
        outstandingAmount: $credexAmount,
        dueDate: date($credexDueDate)
      }]->(acceptor)
      RETURN credex.credexID AS credexID
    `,
    { issuerMemberID, credexID, credexAmount, credexDueDate, acceptorMemberID }
  );

  const markCredexAsProcessed = await ledgerSpaceSession.run(
    `
      MATCH (processedCredex:Credex {credexID: $credexID})
      SET processedCredex.queueStatus = "PROCESSED"
      RETURN processedCredex.credexID AS credexID
    `,
    { credexID: createSearchSpaceCredex.records[0].get("credexID") }
  );

  console.log(
    "credex processed into SearchSpace: " +
      markCredexAsProcessed.records[0].get("credexID")
  );

  let searchForCredloops = true;
  while (searchForCredloops) {
    console.log("finding credloops in searchSpace")
    const searchSpaceQuery = await searchSpaceSession.run(
      `
        MATCH credloop = (issuer:Member {memberID: $issuerMemberID})-[:CREDEX {credexID: $credexID}]->(acceptor: Member)-[*]->(issuer)
        WITH credloop, length(credloop) AS credloopLength, 
            reduce(minDueDate = null, credex IN relationships(credloop) | 
                CASE 
                    WHEN minDueDate IS NULL THEN credex.dueDate
                    WHEN credex.dueDate < minDueDate THEN credex.dueDate
                    ELSE minDueDate
                END) AS earliestDueDate
        ORDER BY credloopLength DESC, earliestDueDate ASC
        LIMIT 1
        WITH credloop, 
            reduce(minAmount = null, credex IN relationships(credloop) | 
                CASE 
                    WHEN minAmount IS NULL THEN credex.outstandingAmount
                    WHEN credex.outstandingAmount < minAmount THEN credex.outstandingAmount
                    ELSE minAmount
                END) AS lowestAmount
        FOREACH (credex IN relationships(credloop) |
            SET credex.outstandingAmount = credex.outstandingAmount - lowestAmount
        )
        WITH credloop, lowestAmount,
          [credex IN relationships(credloop)
          WHERE credex.outstandingAmount = 0 | credex.credexID] AS zeroCredexIDs
        WITH credloop, lowestAmount, zeroCredexIDs, [rel IN relationships(credloop) | rel.credexID] AS credexIDs
        FOREACH (credex IN relationships(credloop) |
            FOREACH (_ IN CASE WHEN credex.outstandingAmount = 0 THEN [1] ELSE [] END |
                DELETE credex
            )
        )
        RETURN lowestAmount, credexIDs, zeroCredexIDs
      `,
      { issuerMemberID, credexID }
    );

    if (searchSpaceQuery.records.length > 0) {
      console.log("credloop found, updating ledgerSpace")
      const valueToClear = searchSpaceQuery.records[0].get("lowestAmount");
      const credexesInLoop = searchSpaceQuery.records[0].get("credexIDs");
      const credexesRedeemed = searchSpaceQuery.records[0].get("zeroCredexIDs");

      const ledgerSpaceQuery = await ledgerSpaceSession.run(
        `
          MATCH (dayNode:DayNode {Active: true})
          CREATE (loopAnchor:LoopAnchor {
              loopedAt: DateTime(),
              loopID: randomUUID(),
              LoopedAmount: $valueToClear,
              CXXmultiplier: 1
          })-[to_dayNode:LOOPED_ON]->(dayNode)
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
              createdAt: DateTime()
          }]->(loopAnchor)

          WITH thisCredex, loopAnchor
          MATCH (thisCredex)-[:OWES]->(:Member)-[:OWES]->(nextCredex:Credex)
          CREATE (thisCredex)-[:CREDLOOP {
              AmountRedeemed: $valueToClear,
              AmountOutstandingNow: thisCredex.OutstandingAmount,
              Denomination: thisCredex.Denomination,
              CXXmultiplier: thisCredex.CXXmultiplier,
              createdAt: DateTime(),
              loopID: loopAnchor.loopID,
              credloopLinkID: randomUUID()
          }]->(nextCredex)

          WITH DISTINCT loopAnchor
          UNWIND $credexesRedeemed AS redeemedCredexID
          MATCH
            (owesOutMember:Member)-[owes1:OWES]->(thisRedeemedCredex:Credex {credexID: redeemedCredexID})-[owes2:OWES]->(owesInMember:Member),
            (thisRedeemedCredex)-[:REDEEMED]->(loopAnchor)
          CREATE
            (owesOutMember)-[:CLEARED]->(thisRedeemedCredex)-[:CLEARED]->(owesInMember)
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
      console.log("no credloops exist in searchSpace")
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


        //create notifications for each member
        var notiFeedDataQuery = await ledgerSpaceSession.run(`
            MATCH (loopAnchor:LoopAnchor{loopID:$loopID})<-[:REDEEMED]-(everyLoopedCredex:Credex)-[:OWES|CLEARED]->(NotiMember:Member)
            
            MATCH (NotiMember)-[:OWES|CLEARED]->(payableCredex:Credex)-[redeemedPayable:REDEEMED]->(loopAnchor), (payableCredex:Credex)-[:OWES|CLEARED]->(payableMember:Member)
            
            MATCH (NotiMember)<-[:OWES|CLEARED]-(receivableCredex:Credex)-[redeemedReceivable:REDEEMED]->(loopAnchor), (receivableCredex:Credex)<-[:OWES|CLEARED]-(receivableMember:Member)
            
            RETURN
              NotiMember.memberID AS notiMemberID,
              redeemedPayable.AmountRedeemed AS payableRedeemed,
              redeemedPayable.Denomination AS payableDenom,
              redeemedPayable.CXXmultiplier AS payableCXXmult,
              payableMember.firstname AS payableMemberFirstname,
              payableMember.lastname AS payableMemberLastname,
              redeemedReceivable.AmountRedeemed AS receivableRedeemed,
              redeemedReceivable.Denomination AS receivableDenom,
              redeemedReceivable.CXXmultiplier AS receivableCXXmult,
              receivableMember.firstname AS receivableMemberFirstname,
              receivableMember.lastname AS receivableMemberLastname
  
            `,
          {
            loopID: loopID
          }
        )
        for (let notiIndex = 0; notiIndex < notiFeedDataQuery.records.length; notiIndex++) {
          var notiData = notiFeedDataQuery.records[notiIndex];

          var notiMemberID = notiData.get("notiMemberID")
          var amountPayableCXX = notiData.get("payableRedeemed")
          var payableDenom = notiData.get("payableDenom")
          var payableCXXmult = notiData.get("payableCXXmult")
          var payableMemberFirstname = notiData.get("payableMemberFirstname")
          var payableMemberLastname = notiData.get("payableMemberLastname")
          var amountReceivableCXX = notiData.get("receivableRedeemed")
          var receivableDenom = notiData.get("receivableDenom")
          var receivableCXXmult = notiData.get("receivableCXXmult")
          var receivableMemberFirstname = notiData.get("receivableMemberFirstname")
          var receivableMemberLastname = notiData.get("receivableMemberLastname")

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

          var notiFeedText = amountPayableFormatted + " that you owed to " + payableMemberFirstname + " " + payableMemberLastname + " has been credlooped against " + amountReceivableFormatted + " that " + receivableMemberFirstname + " " + receivableMemberLastname + " owed you.";


          console.log(notiMemberID)
          console.log(notiFeedText)

          //push noti to member
          var rest = new Ably.Rest({ key: process.env.ABLY_API_KEY });
          var channel = rest.channels.get('credex-user-' + notiMemberID);

          channel.publish('user-notification', JSON.stringify({ notiMemberID: null, message: notiFeedText }));

          channel.publish('update-user', "refresh data after loop");
        }
      */
