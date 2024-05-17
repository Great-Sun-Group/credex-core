import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { denomFormatter } from '../../Core/constants/denominations';
const _ = require("lodash");

export async function GetPendingOffersOutService(memberID: string) {
  try {
    const ledgerSpaceSession = ledgerSpaceDriver.session()
    const result = await ledgerSpaceSession.run(`
        OPTIONAL MATCH
            (member:Member{memberID:$memberID})-[:OFFERS]->(offersOutCredex:Credex)-[:OFFERS]->(counterparty:Member)
        OPTIONAL MATCH (offersOutCredex)<-[:SECURES]-(securer:Member)
        RETURN
            offersOutCredex.InitialAmount/offersOutCredex.CXXmultiplier AS InitialAmount,
            offersOutCredex.credexID AS credexID,
            offersOutCredex.Denomination AS Denomination,
            counterparty.firstname AS counterpartyFirstname,
            counterparty.lastname AS counterpartyLastname,
            counterparty.companyname AS counterpartyCompanyname,
            counterparty.memberType AS counterpartyMemberType,
            securer.companyname AS securerName

    `, { memberID: memberID });
    await ledgerSpaceSession.close(); 

    var offeredCredexData: any = []
    if (result.records[0].get('credexID')) {
      result.records.forEach(async function (record) {
          const credexID = record.get('credexID')
          const InitialAmount = record.get('InitialAmount')
          const Denomination = record.get('Denomination')
          const counterpartyFirstname = record.get('counterpartyFirstname')
          const counterpartyLastname = record.get('counterpartyLastname')
          const counterpartyCompanyname = record.get('counterpartyCompanyname')
          const counterpartyMemberType = record.get('counterpartyMemberType')
          const securerName = record.get('securerName')

          const formattedInitialAmount = denomFormatter(
              InitialAmount,
              Denomination
          ) + " " + Denomination
          var counterpartyDisplayname = ""
          if (counterpartyMemberType == "HUMAN") {
            counterpartyDisplayname = counterpartyFirstname + " " + counterpartyLastname
          }
          if (counterpartyMemberType == "COMPANY" || counterpartyMemberType == "CREDEX_FOUNDATION") {
            counterpartyDisplayname = counterpartyCompanyname
          }

          const thisOfferedCredex = {
              "credexID": credexID,
              "formattedInitialAmount": formattedInitialAmount,
              "counterpartyDisplayname": counterpartyDisplayname,
              "securerName": securerName,
          }
          offeredCredexData.push(thisOfferedCredex)
      });
  }

    return {
      "numberOfOffers": _.size(offeredCredexData),
      "offers": offeredCredexData,
  }

    
  } catch (error) {
    console.log(error)
  }
}