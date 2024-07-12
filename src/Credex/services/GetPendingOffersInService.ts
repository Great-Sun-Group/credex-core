/*
returns offers made to a account and not yet accepted/declined/cancelled

requires accountID

returns for each pending offer:
  credexID
  formattedInitialAmount (eg 1,234.56 USD)
  counterpartyDisplayname
  secured boolean

returns empty array if no pending offers in, or if accountID not found

*/

import { ledgerSpaceDriver } from "../../Admin/config/neo4j";
import { denomFormatter } from "../../Core/constants/denominations";
import { GetDisplayNameService } from "../../Account/services/GetDisplayNameService";
import { Credex } from "../types/Credex";
import moment from "moment-timezone";

export async function GetPendingOffersInService(accountID: string) {
  try {
    const ledgerSpaceSession = ledgerSpaceDriver.session();
    const result = await ledgerSpaceSession.run(
      `
        OPTIONAL MATCH
          (account:Account{accountID:$accountID})<-[:OFFERS]-(offersInCredex:Credex)<-[:OFFERS]-(counterparty:Account)
        OPTIONAL MATCH
          (offersInCredex)<-[:SECURES]-(securer:Account)
        RETURN
          offersInCredex.InitialAmount / offersInCredex.CXXmultiplier AS InitialAmount,
          offersInCredex.credexID AS credexID,
          offersInCredex.Denomination AS Denomination,
          offersInCredex.dueDate AS dueDate,
          counterparty.firstname AS counterpartyFirstname,
          counterparty.lastname AS counterpartyLastname,
          counterparty.companyname AS counterpartyCompanyname,
          counterparty.accountType AS counterpartyAccountType,
          securer IS NOT NULL as secured
      `,
      { accountID }
    );
    await ledgerSpaceSession.close();

    if (!result.records[0].get("credexID")) {
      return {};
    }

    const offeredCredexData: Credex[] = [];
    for (const record of result.records) {
      const formattedInitialAmount =
        denomFormatter(
          record.get("InitialAmount"),
          record.get("Denomination")
        ) +
        " " +
        record.get("Denomination");

      const counterpartyDisplayname = GetDisplayNameService({
        accountType: record.get("counterpartyAccountType"),
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
    console.error("Error in GetPendingOffersInService:", error);
    throw error;
  }
}
