/*
returns offers made by a member and not yet accepted/declined/cancelled

requires memberID

returns for each pending offer:
  credexID
  formattedInitialAmount (eg 1,234.56 USD)
  counterpartyDisplayname
  secured boolean

returns empty array if no pending offers out, or if memberID not found

*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { denomFormatter } from "../../Core/constants/denominations";
import { GetDisplayNameService } from "../../Member/services/GetDisplayNameService";
import { Credex } from "../types/Credex";
import moment from "moment-timezone";

export async function GetPendingOffersOutService(memberID: string) {
  try {
    const ledgerSpaceSession = ledgerSpaceDriver.session();
    const result = await ledgerSpaceSession.run(
      `
        OPTIONAL MATCH
          (member:Member{memberID:$memberID})-[:OFFERS]->(offersOutCredex:Credex)-[:OFFERS]->(counterparty:Member)
        OPTIONAL MATCH
          (offersOutCredex)<-[:SECURES]-(securer:Member)
        RETURN
          offersOutCredex.InitialAmount * offersOutCredex.CXXmultiplier AS InitialAmount,
          offersOutCredex.credexID AS credexID,
          offersOutCredex.Denomination AS Denomination,
          offersOutCredex.dueDate AS dueDate,
          counterparty.firstname AS counterpartyFirstname,
          counterparty.lastname AS counterpartyLastname,
          counterparty.companyname AS counterpartyCompanyname,
          counterparty.memberType AS counterpartyMemberType,
          securer IS NOT NULL as secured
      `,
      { memberID }
    );
    await ledgerSpaceSession.close();

    if (!result.records[0].get("credexID")) {
      return {};
    }

    const offeredCredexData: Credex[] = [];
    for (const record of result.records) {
      const formattedInitialAmount =
        denomFormatter(
          parseFloat("-" + record.get("InitialAmount")),
          record.get("Denomination")
        ) +
        " " +
        record.get("Denomination");

      const counterpartyDisplayname = GetDisplayNameService({
        memberType: record.get("counterpartyMemberType"),
        firstname: record.get("counterpartyFirstname"),
        lastname: record.get("counterpartyLastname"),
        companyname: record.get("counterpartyCompanyname"),
      });

      if (!counterpartyDisplayname) {
        console.log("error: could not process counterparty displayname");
        return false;
      }

      const thisOfferedCredex: Credex = {
        credexID: record.get("credexID"),
        formattedInitialAmount: formattedInitialAmount,
        counterpartyDisplayname: counterpartyDisplayname,
      };
      if (record.get("dueDate")) {
        thisOfferedCredex.dueDate = moment(record.get("dueDate"))
          .subtract(1, "months") //because moment uses Jan = 0 and neo4j uses Jan = 1
          .format("YYYY-MM-DD");
      }
      if (record.get("secured")) {
        thisOfferedCredex.secured = record.get("secured");
      }
      offeredCredexData.push(thisOfferedCredex);
    }

    return offeredCredexData;
  } catch (error) {
    console.error("Error in GetPendingOffersOutService:", error);
    throw error;
  }
}
