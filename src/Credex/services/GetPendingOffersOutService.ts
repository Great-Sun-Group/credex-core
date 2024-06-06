/*
returns offers made by a member and not yet accepted/declined/cancelled

requires memberID

returns for each pending offer:
  credexID
  formattedInitialAmount (eg 1,234.56 USD)
  counterpartyDisplayname

returns empty array if no pending offers out, or if memberID not found

*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { denomFormatter } from "../../Core/constants/denominations";
import { Credex } from "../types/Credex";

export async function GetPendingOffersOutService(memberID: string) {
  try {
    const ledgerSpaceSession = ledgerSpaceDriver.session();
    const result = await ledgerSpaceSession.run(
      `
        OPTIONAL MATCH
          (member:Member{memberID:$memberID})-[:OFFERS]->(offersOutCredex:Credex)-[:OFFERS]->(counterparty:Member)
        RETURN
          offersOutCredex.InitialAmount/offersOutCredex.CXXmultiplier AS InitialAmount,
          offersOutCredex.credexID AS credexID,
          offersOutCredex.Denomination AS Denomination,
          counterparty.firstname AS counterpartyFirstname,
          counterparty.lastname AS counterpartyLastname,
          counterparty.companyname AS counterpartyCompanyname,
          counterparty.memberType AS counterpartyMemberType
      `,
      { memberID }
    );
    await ledgerSpaceSession.close();

    if (!result.records[0].get("credexID")) {
      return {};
    }

    const offeredCredexData: Credex[] = [];
    for (const record of result.records) {
      const credexID = record.get("credexID");

      const formattedInitialAmount =
        denomFormatter(
          parseFloat("-" + record.get("InitialAmount")),
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
    console.error("Error in GetPendingOffersOutService:", error);
    throw error;
  }
}
