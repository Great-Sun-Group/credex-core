import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
export async function GetSecurableDataService(
  memberID: string,
  Denomination: string,
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const getSecurableDataQuery = await ledgerSpaceSession.run(
    `
        //find all inbound secured credexes of denom
        OPTIONAL MATCH
            (member:Member {memberID:$memberID})<-[:OWES]-(owesInCredex)<-[:SECURES]-(securingMember:Member)<-[:CREDEX_FOUNDATION_AUDITED]-(credexFoundation{memberType:"CREDEX_FOUNDATION"})
            WHERE owesInCredex.Denomination = $Denomination

        //separate out into each securingMember
        WITH
            DISTINCT securingMember as securingMemberDistinct,
            member
        //for each securing member get issuer's available secured balance
        UNWIND securingMemberDistinct AS thisSecuringMember
            OPTIONAL MATCH
                //include only OWES balance on inbound
                (thisSecuringMember)-[:SECURES]->
                (securedCredexIn:Credex)
                -[:OWES]->(member)
                WHERE securedCredexIn.Denomination = $Denomination

            OPTIONAL MATCH
                //include OWES and OFFERS on outbound so that issuer cannot offer multiple secured on the same security
                (member)-[:OWES|OFFERS]->(securedCredexOut:Credex)
                WHERE securedCredexOut.Denomination = $Denomination

        WITH
            sum(securedCredexIn.OutstandingAmount)
            - sum(securedCredexOut.OutstandingAmount)
            AS thisNetSecurableCXX,
            thisSecuringMember.memberID AS thisSecuringMemberID
        MATCH (daynode:DayNode{Active:true})
        RETURN
            thisNetSecurableCXX*daynode[$Denomination] AS netSecurableInDenom,
            thisSecuringMemberID AS securingMemberID
            ORDER BY netSecurableInDenom DESC LIMIT 1
    `,
    {
      memberID: memberID,
      Denomination: Denomination,
    },
  );

  const securableData = {
    netSecurableInDenom: 0,
    securingMemberID: "",
  };
  if (getSecurableDataQuery.records[0]) {
    securableData.netSecurableInDenom = getSecurableDataQuery.records[0].get(
      "netSecurableInDenom",
    );
    securableData.securingMemberID =
      getSecurableDataQuery.records[0].get("securingMemberID");
  } else {
    securableData.netSecurableInDenom = 0;
    securableData.securingMemberID = "";
  }
  ledgerSpaceSession.close();
  return securableData;
}
