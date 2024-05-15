import { ledgerSpaceDriver, searchSpaceDriver } from "../../config/neo4j/neo4j";
//import { loopFinder } from './LoopFinder';

export async function MinuteTransactionQueue() {
/*
  console.log('check if DCO in progress');
  var DCOinProgressCheck = await ledgerSpaceSession.run(`
      OPTIONAL MATCH (dayNode:DayNode{Active:true})
      RETURN dayNode.DCOrunningNow AS DCOflag
      `,
  )
  var DCOinProgress = DCOinProgressCheck.records[0].get("DCOflag")

  if (DCOinProgress) {
    console.log('DCO in progress, hold loopfinder')
  }

  else {
    console.log('running loopfinder');
    const BAIL_TIME = (60 * 1000) * 14; // 14 minutes
    return new Promise(async (resolve, reject) => {

      let bailTimer = setTimeout(function () {
        // bail here... what do we do?
        resolve(true);
      }, (BAIL_TIME))

      //get queued actions

      var queuedActions = []

      //get PENDING_CREDEX queued credexes
      var getQueuedCredexes = await ledgerSpaceSession.run(`
        MATCH (issuerMember:Member)-[:OWES]->(queuedCredex:Credex{queueStatus:"PENDING_CREDEX"})-[:OWES]->(acceptorMember:Member)
        RETURN queuedCredex.acceptedAt AS timestamp, issuerMember.memberID AS issuerMemberID, queuedCredex.credexID AS credexID, queuedCredex.InitialAmount AS credexAmount, queuedCredex.dueDate AS credexDueDate, acceptorMember.memberID AS acceptorMemberID
      `,)

      getQueuedCredexes.records.forEach(function (queuedCredex) {
        queuedActions.push({
          timestamp: 2,
          issuerMemberID: queuedCredex.get("issuerMemberID"),
          credexID: queuedCredex.get("credexID"),
          credexAmount: queuedCredex.get("credexAmount"),
          credexDueDate: queuedCredex.get("credexDueDate"),
          acceptorMemberID: queuedCredex.get("acceptorMemberID"),
          actionType: "PENDING_CREDEX"
        })
      })

      //get PENDING_MEMBER queued members
      var getQueuedMembers = await ledgerSpaceSession.run(`
        MATCH (newMember:Member{queueStatus:"PENDING_MEMBER"})
        RETURN newMember.memberSince AS timestamp, newMember.memberID AS memberID
      `,)

      getQueuedMembers.records.forEach(function (queuedMember) {
        queuedActions.push({
          timestamp: 1,
          memberID: queuedMember.get("memberID"),
          actionType: "PENDING_MEMBER"
        })
      })

      //order by timestamp
      queuedActions = _.sortBy(queuedActions, 'timestamp');

      console.log('queuedActions: -------------->');
      console.log(queuedActions);

      for (let i = 0; i < queuedActions.length; i++) {

        //test for actionType
        if (queuedActions[i].actionType == "PENDING_MEMBER") {
          //add member
          var memberID = queuedActions[i].memberID;
          var addMember = await searchSpaceSession.run(`
            CREATE (newMember:Member{memberID:$memberID})
            RETURN newMember.memberID AS memberID
          `,{
              memberID: memberID
            }
          )
          console.log("member created in SearchSpace: " + addMember.records[0].get("memberID"))

          //test for successfull result, then:
          var markMemberProcessed = await ledgerSpaceSession.run(`
            MATCH (processedMember:Member{memberID:$memberID})
            SET processedMember.queueStatus = "PROCESSED"
            `,
            {
              memberID: memberID
            }
          )
        }

        else if (queuedActions[i].actionType == "PENDING_CREDEX") {

          await loopFinder(queuedActions[i].issuerMemberID, queuedActions[i].credexID, queuedActions[i].credexAmount, queuedActions[i].credexDueDate, queuedActions[i].acceptorMemberID);

          //test for successfull result, then:
          var credexID = queuedActions[i].credexID;
          var markCredexProcessed = await ledgerSpaceSession.run(`
            MATCH (processedCredex:Credex{credexID:$credexID})
            SET processedCredex.queueStatus = "PROCESSED"
          `,{
              credexID: credexID
          })
        };
      }

      await ledgerSpaceSession.close();
      await searchSpaceSession.close();

      setTimeout(function () {
        // clear bailtimer....
        clearTimeout(bailTimer);
        resolve(true);
      }, (1000))
    });
  }
  */
}