/*
returns offers made to a member and not yet accepted/declined/cancelled

requires memberID

returns for each pending offer:
  credexID
  formattedInitialAmount (eg 1,234.56 USD)
  counterpartyDisplayname

returns empty array if no pending offers in, or if memberID not found

*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { denomFormatter } from "../../Core/constants/denominations";
import { Credex } from "../types/Credex";

export async function GetPendingOffersInService(memberID: string) {
  try {
    const ledgerSpaceSession = ledgerSpaceDriver.session();
    const result = await ledgerSpaceSession.run(
      `
        OPTIONAL MATCH
          (member:Member{memberID:$memberID})<-[:OFFERS]-(offersInCredex:Credex)<-[:OFFERS]-(counterparty:Member)
        RETURN
          offersInCredex.InitialAmount/offersInCredex.CXXmultiplier AS InitialAmount,
          offersInCredex.credexID AS credexID,
          offersInCredex.Denomination AS Denomination,
          counterparty.firstname AS counterpartyFirstname,
          counterparty.lastname AS counterpartyLastname,
          counterparty.companyname AS counterpartyCompanyname,
          counterparty.memberType AS counterpartyMemberType
      `,
      { memberID }
    );
    await ledgerSpaceSession.close();

    if (!result.records[0].get("credexID")) {
      return {}
    }

    const offeredCredexData: Credex[] = [];
    for (const record of result.records) {
      const credexID = record.get("credexID");

      const formattedInitialAmount =
        denomFormatter(
          record.get("InitialAmount"),
          record.get("Denomination")
        ) +
        " " +
        record.get("Denomination");

      let counterpartyDisplayname;
      if (record.get("counterpartyMemberType") === "HUMAN") {
        counterpartyDisplayname =
          record.get("counterpartyFirstname") +
          " " +
          record.get("counterpartyLastname");
      } else if (
        record.get("counterpartyCompanyname") === "COMPANY" ||
        record.get("counterpartyCompanyname") === "CREDEX_FOUNDATION"
      ) {
        counterpartyDisplayname = record.get("counterpartyCompanyname");
      }

      const thisOfferedCredex: Credex = {
        credexID: credexID,
        formattedInitialAmount: formattedInitialAmount,
        counterpartyDisplayname: counterpartyDisplayname,
      };
      offeredCredexData.push(thisOfferedCredex);
    }

    return offeredCredexData;
  } catch (error) {
    console.error("Error in GetPendingOffersInService:", error);
    throw error;
  }
}
