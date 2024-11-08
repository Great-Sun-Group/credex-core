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

export async function GetPendingOffersOutService(accountID: string) {
  logDebug(`Entering GetPendingOffersOutService`, { accountID });

  try {
    logDebug(`Attempting to fetch pending offers out from database`, { accountID });
    const ledgerSpaceSession = ledgerSpaceDriver.session();
    const result = await ledgerSpaceSession.run(
      `
        OPTIONAL MATCH
          (account:Account{accountID:$accountID})-[:OFFERS]->(offersOutCredex:Credex)-[:OFFERS]->(counterparty:Account)
        OPTIONAL MATCH
          (offersOutCredex)<-[:SECURES]-(securer:Account)
        RETURN
          offersOutCredex.InitialAmount / offersOutCredex.CXXmultiplier AS InitialAmount,
          offersOutCredex.credexID AS credexID,
          offersOutCredex.Denomination AS Denomination,
          offersOutCredex.dueDate AS dueDate,
          counterparty.accountName AS counterpartyAccountName,
          securer IS NOT NULL as secured
      `,
      { accountID }
    );
    await ledgerSpaceSession.close();

    if (!result.records[0].get("credexID")) {
      logInfo(`No pending offers out found for account`, { accountID });
      return {};
    }

    const offeredCredexData = [];
    for (const record of result.records) {
      const formattedInitialAmount =
        denomFormatter(
          parseFloat("-" + record.get("InitialAmount")),
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

    logInfo(`Successfully fetched pending offers out`, { accountID, offerCount: offeredCredexData.length });
    logDebug(`Exiting GetPendingOffersOutService`, { accountID });
    return offeredCredexData;
  } catch (error) {
    logError(`Error in GetPendingOffersOutService:`, error as Error, { accountID });
    throw error;
  }
}
