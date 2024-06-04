import { ledgerSpaceDriver, searchSpaceDriver } from "../../config/neo4j/neo4j";
import * as neo4j from "neo4j-driver";
const _ = require("lodash");

const transformIntegers = function (val: number) {
  return neo4j.isInt(val)
    ? neo4j.integer.inSafeRange(val)
      ? val.toNumber()
      : val.toString()
    : val;
};

export async function LoopFinder(
  issuerMemberID: string,
  credexID: string,
  credexAmount: number,
  credexDueDate: string,
  acceptorMemberID: string,
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  var createSearchSpaceCredex = await searchSpaceSession.run(
    `
      MATCH (issuer:Member{memberID:$issuerMemberID})
      MATCH (acceptor:Member{memberID:$acceptorMemberID})
      CREATE (issuer)-[credex:CREDEX{credexID:$credexID, credexAmount:$credexAmount, credexDueDate:$credexDueDate}]->(acceptor)
      RETURN credex.credexID AS credexID
    `,
    {
      issuerMemberID: issuerMemberID,
      credexID: credexID,
      credexAmount: credexAmount,
      credexDueDate: credexDueDate,
      acceptorMemberID: acceptorMemberID,
    },
  );
  console.log(
    "credex created in SearchSpace: " +
      createSearchSpaceCredex.records[0].get("credexID"),
  );

  var continueLooping = true;

  if (issuerMemberID && acceptorMemberID && credexID) {
    while (continueLooping) {
      var credloopsQuery = await searchSpaceSession.run(
        `
            MATCH credloops = (issuer)-[:CREDEX{credexID:$credexID}]->(acceptor)-[*]->(issuer)
            RETURN credloops
          `,
        {
          credexID: credexID,
        },
      );

      var credloops: any = [];

      console.log("loop count:" + credloopsQuery.records.length);

      if (credloopsQuery.records && credloopsQuery.records.length > 0) {
        // loop through records response
        credloopsQuery.records.forEach(function (record: any) {
          record = record.get("credloops");

          var segments: any = [];

          // initially set obj attributes to null
          var credloopObj = {
            credexDueDate: null,
            loopLength: null,
            lowestAmount: null,
            segments: null,
          };

          // check for segments
          if (record.segments && record.segments.length) {
            var segs = record.segments;

            // loop through segments and set attributes on our object
            segs.forEach(function (seg: any) {
              var segsObj: any = {
                credexDueDate: "",
                credexAmount: 0,
                credexID: "",
              };

              if (seg.relationship.properties.credexAmount) {
                segsObj.credexAmount = transformIntegers(
                  seg.relationship.properties.credexAmount,
                );
              }
              if (seg.relationship.properties.credexID) {
                segsObj.credexID = seg.relationship.properties.credexID;
              }
              segments.push(segsObj);
            });

            // set length of loop
            credloopObj.loopLength = segs.length;

            //set lowest amount in this loop
            segments = _.orderBy(segments, "credexAmount", "asc"); // asc, desc
            credloopObj.lowestAmount = segments[0].credexAmount;

            // order by lowest/soonest first asc (null is at the end) to set soonest demmurage date in this loop
            segments = _.orderBy(segments, "credexDueDate", "asc"); // asc, desc
            credloopObj.credexDueDate = segments[0].credexDueDate;

            //save credexes in loop to our object
            credloopObj.segments = segments;
          }

          credloops.push(credloopObj);
        }); // end credloopsQuery.records foreach

        // identify soonest due date
        credloops = _.orderBy(credloops, "credexDueDate");
        var soonestDueDate = credloops[0].credexDueDate;

        // array of loops with the soonest day if there is multiple
        var loopsWithSoonestDate = _.filter(credloops, {
          credexDueDate: soonestDueDate,
        });

        // order them by the longest loops
        loopsWithSoonestDate = _.orderBy(
          loopsWithSoonestDate,
          "loopLength",
          "desc",
        );

        //identify loopToClose
        //if there are multiple loops that match above criteria, this will pick one "arbitrarily." will be updated, but this meets mvp standards.
        var loopToClose = loopsWithSoonestDate[0];
        var valueToClear = loopToClose.lowestAmount;

        //start updating the DBs with the selected loop

        //LedgerSpace: Create the LoopAnchor and link it to DayNode
        var createLoopAnchor = await ledgerSpaceSession.run(
          `
          MATCH (dayNode:DayNode)
          WHERE dayNode.Active = true
          CREATE (redeemednode:LoopAnchor { loopedAt:DateTime(), loopID:randomUUID(), LoopedAmount: $valueToClear, CXXmultiplier: 1})-[to_dayNode:LOOPED_ON]->(dayNode)
          RETURN redeemednode.loopID AS loopID
          `,
          {
            valueToClear: valueToClear,
          },
        );
        var loopID = createLoopAnchor.records[0].get("loopID");

        for (
          let thisLoopedCredexNum = 0;
          thisLoopedCredexNum < loopToClose.segments.length;
          thisLoopedCredexNum++
        ) {
          var credexID: string =
            loopToClose.segments[thisLoopedCredexNum].credexID;

          //SearchSpace: subtract valueToClear and return credexID if credex is redeemed
          var subtractValueSearchSpace = await searchSpaceSession.run(
            `
            MATCH ()-[thisCredex:CREDEX{credexID: $credexID}]->()
            SET thisCredex.credexAmount = thisCredex.credexAmount - $valueToClear
            RETURN
            CASE thisCredex.credexAmount
              WHEN 0  THEN thisCredex.credexID
            END AS redeemedCredexID
            `,
            {
              valueToClear: valueToClear,
              credexID: credexID,
            },
          );
          var redeemedCredexID =
            subtractValueSearchSpace.records[0].get("redeemedCredexID");

          //LedgerSpace: update with valueToClear, connect to LoopAnchor
          var populateLoopLedgerSpace = await ledgerSpaceSession.run(
            `
            MATCH (thisCredex:Credex{credexID: $credexID})
            MATCH (loopAnchor:LoopAnchor{loopID: $loopID})
          
            SET thisCredex.OutstandingAmount = thisCredex.OutstandingAmount - $valueToClear
            SET thisCredex.RedeemedAmount = thisCredex.RedeemedAmount + $valueToClear
            CREATE (thisCredex)-[:REDEEMED {
              AmountRedeemed: $valueToClear,
              AmountOutstandingNow: thisCredex.OutstandingAmount,
              Denomination:thisCredex.Denomination,
              CXXmultiplier: thisCredex.CXXmultiplier,
              createdAt: DateTime()
            }]->(loopAnchor)
            `,
            {
              valueToClear: valueToClear,
              credexID: credexID,
              loopID: loopID,
            },
          );

          if (redeemedCredexID !== null) {
            //SearchSpace: delete redeemed credex
            var deleteRedeemed = await searchSpaceSession.run(
              `
              MATCH ()-[thisCredex:CREDEX{credexID: $redeemedCredexID}]->()
              DELETE thisCredex
              `,
              {
                redeemedCredexID: redeemedCredexID,
              },
            );

            //LedgerSpace: update redeemed credex
            var deleteRedeemed = await ledgerSpaceSession.run(
              `
              MATCH (owesOutMember:Member)-[owes1:OWES]->(thisCredex:Credex{credexID: $redeemedCredexID})-[owes2:OWES]->(owesInMember:Member)
              CREATE (owesOutMember)-[:CLEARED]->(thisCredex)-[:CLEARED]->(owesInMember)
              SET thisCredex.DateRedeemed = DateTime()
              DELETE owes1, owes2
              `,
              {
                redeemedCredexID: redeemedCredexID,
              },
            );
          }
        }

        //need to loop through the same credexes again because this cypher has to be run once all the credexes have been connected to the loopanchor

        for (
          let thisLoopedCredexNum2 = 0;
          thisLoopedCredexNum2 < loopToClose.segments.length;
          thisLoopedCredexNum2++
        ) {
          var credexID: string =
            loopToClose.segments[thisLoopedCredexNum2].credexID;
          var valueToClear = loopToClose.lowestAmount;

          //LedgerSpace: create CREDLOOP relationships between Credexes
          var createCREDLOOPrels = await ledgerSpaceSession.run(
            `
            MATCH (thisCredex{credexID: $credexID})-[:OWES|CLEARED]->(:Member)-[:OWES|CLEARED]->(nextCredex:Credex)-[:REDEEMED]->(redeemednode:LoopAnchor{loopID: $loopID})
            CREATE (thisCredex)-[:CREDLOOP {
              AmountRedeemed: $valueToClear,
              AmountOutstandingNow:thisCredex.OutstandingAmount,
              Denomination:thisCredex.Denomination,
              CXXmultiplier: thisCredex.CXXmultiplier,
              createdAt: DateTime(),
              loopAnchorID: redeemednode.loopID,
              credloopLinkID: randomUUID()
            }]->(nextCredex)
            `,
            {
              valueToClear: valueToClear,
              credexID: credexID,
              loopID: loopID,
            },
          );
        }

        /*

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
        continueLooping = true;
      } else {
        continueLooping = false;
      }
    } // end while(continueLooping)

    return true;
  } // end if (issuerMemberID && acceptorMemberID && credexID)
}
