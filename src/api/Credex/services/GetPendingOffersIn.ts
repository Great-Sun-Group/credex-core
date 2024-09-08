import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import moment from "moment-timezone";
import { logDebug, logInfo, logWarning, logError } from "../../../utils/logger";

interface OfferedCredex {
  credexID: string;
  formattedInitialAmount: string;
  counterpartyAccountName: string;
  dueDate?: string; // optional field
  secured?: boolean; // optional field
}

export async function GetPendingOffersInService(accountID: string) {
  logDebug(`Entering GetPendingOffersInService`, { accountID });

  try {
    logDebug(`Attempting to fetch pending offers from database`, { accountID });
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
          counterparty.accountName AS counterpartyAccountName,
          securer IS NOT NULL as secured
      `,
      { accountID }
    );
    await ledgerSpaceSession.close();

    if (!result.records[0].get("credexID")) {
      logInfo(`No pending offers found for account`, { accountID });
      return {};
    }

    const offeredCredexData = [];
    for (const record of result.records) {
      const formattedInitialAmount =
        denomFormatter(
          record.get("InitialAmount"),
          record.get("Denomination")
        ) +
        " " +
        record.get("Denomination");

      const thisOfferedCredex: OfferedCredex = {
        credexID: record.get("credexID"),
        formattedInitialAmount: formattedInitialAmount,
        counterpartyAccountName: record.get("counterpartyAccountName"),
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

    logInfo(`Successfully fetched pending offers`, { accountID, offerCount: offeredCredexData.length });
    logDebug(`Exiting GetPendingOffersInService`, { accountID });
    return offeredCredexData;
  } catch (error) {
    logError(`Error in GetPendingOffersInService:`, error as Error, { accountID });
    throw error;
  }
}
