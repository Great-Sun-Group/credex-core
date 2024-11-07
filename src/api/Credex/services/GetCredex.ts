import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import moment from "moment-timezone";
import { logDebug, logInfo, logWarning, logError } from "../../../utils/logger";

export async function GetCredexService(credexID: string, accountID: string) {
  logDebug(`Entering GetCredexService`, { credexID, accountID });

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    logDebug(`Attempting to fetch Credex data from database`, { credexID, accountID });
    const result = await ledgerSpaceSession.run(
      `
        MATCH
        (account:Account {accountID: $accountID})-[transactionType:OWES|CLEARED|REQUESTS|OFFERS|DECLINED|CANCELLED]-(credex:Credex {credexID: $credexID})-[:OWES|CLEARED|REQUESTS|OFFERS|DECLINED|CANCELLED]-(counterparty:Account)
        OPTIONAL MATCH (credex)<-[:SECURES]-(securer:Account)
        OPTIONAL MATCH (credex)-[credloopRel:CREDLOOP]-(clearedAgainstCredex:Credex)-[:OWES|CLEARED]-(account), (clearedAgainstCredex)-[:OWES|CLEARED]-(clearedAgainstCounterparty:Account)
        RETURN
        credex.credexID AS credexID,
        type(transactionType) AS transactionType,
        (startNode(transactionType) = account) AS debit,
        counterparty.accountName AS counterpartyAccountName,
        securer.accountID AS securerID,
        securer.accountName AS securerName,
        credex.Denomination AS Denomination,
        credex.InitialAmount / credex.CXXmultiplier AS InitialAmount,
        credex.OutstandingAmount / credex.CXXmultiplier AS OutstandingAmount,
        credex.RedeemedAmount / credex.CXXmultiplier AS RedeemedAmount,
        credex.DefaultedAmount / credex.CXXmultiplier AS DefaultedAmount,
        credex.WrittenOffAmount / credex.CXXmultiplier AS WrittenOffAmount,
        credex.acceptedAt AS acceptedAt,
        credex.declinedAt AS declinedAt,
        credex.cancelledAt AS cancelledAt,
        credex.dueDate AS dueDate,
        clearedAgainstCredex.credexID AS clearedAgainstCredexID,
        credloopRel.AmountRedeemed / credloopRel.CXXmultiplier AS clearedAmount,
        clearedAgainstCredex.InitialAmount / clearedAgainstCredex.CXXmultiplier AS clearedAgainstCredexInitialAmount,
        clearedAgainstCredex.Denomination AS clearedAgainstCredexDenomination,
        clearedAgainstCounterparty.accountName AS clearedAgainstCounterpartyAccountName
      `,
      { credexID, accountID }
    );

    if (result.records.length === 0) {
      logWarning(`No records found for credexID: ${credexID}`, { credexID, accountID });
      throw new Error("No records found");
    }

    logInfo(`Successfully fetched Credex data`, { credexID, accountID });

    const record = result.records[0];
    const debit = record.get("debit");

    type Amounts = {
      InitialAmount: number;
      OutstandingAmount: number;
      RedeemedAmount: number;
      DefaultedAmount: number;
      WrittenOffAmount: number;
    };

    const amounts: Amounts = [
      "InitialAmount",
      "OutstandingAmount",
      "RedeemedAmount",
      "DefaultedAmount",
      "WrittenOffAmount",
    ].reduce(
      (acc: Amounts, amount: string) => {
        const value = parseFloat(record.get(amount));
        acc[amount as keyof Amounts] = debit ? -value : value;
        return acc;
      },
      {
        InitialAmount: 0,
        OutstandingAmount: 0,
        RedeemedAmount: 0,
        DefaultedAmount: 0,
        WrittenOffAmount: 0,
      }
    );

    const Denomination = record.get("Denomination");
    const formattedAmounts = (
      Object.entries(amounts) as [keyof Amounts, number][]
    ).reduce((acc, [key, value]) => {
      acc[`formatted${key}`] = `${denomFormatter(
        value,
        Denomination
      )} ${Denomination}`;
      return acc;
    }, {} as Record<string, string>);

    const formatDate = (date: string | null) => {
      if (!date) return null;
      return moment(date).subtract(1, "month").format("YYYY-MM-DD");
    };

    const acceptedAt = formatDate(record.get("acceptedAt"));
    const declinedAt = formatDate(record.get("declinedAt"));
    const cancelledAt = formatDate(record.get("cancelledAt"));
    const dueDate = formatDate(record.get("dueDate"));
    const counterpartyAccountName = record.get("counterpartyAccountName")

    const credexData = {
      credexID: record.get("credexID"),
      transactionType: record.get("transactionType"),
      debit,
      counterpartyAccountName,
      securerID: record.get("securerID"),
      securerName: record.get("securerName"),
      Denomination,
      acceptedAt,
      declinedAt,
      cancelledAt,
      dueDate,
      ...formattedAmounts,
    };

    const clearedAgainstData = result.records
      .filter((record) => record.get("clearedAgainstCredexID"))
      .map((record) => {
        const clearedAmount = record.get("clearedAmount");
        const clearedAgainstCredexInitialAmount = parseFloat(
          record.get("clearedAgainstCredexInitialAmount")
        );
        const signumClearedAgainstCredexInitialAmount = debit
          ? clearedAgainstCredexInitialAmount
          : -clearedAgainstCredexInitialAmount;
        const clearedAgainstCredexDenomination = record.get(
          "clearedAgainstCredexDenomination"
        );

        const clearedAgainstCounterpartyAccountName = record.get("clearedAgainstCounterpartyAccountName")

        return {
          clearedAgainstCredexID: record.get("clearedAgainstCredexID"),
          formattedClearedAmount: `${denomFormatter(
            clearedAmount,
            clearedAgainstCredexDenomination
          )} ${clearedAgainstCredexDenomination}`,
          formattedClearedAgainstCredexInitialAmount: `${denomFormatter(
            signumClearedAgainstCredexInitialAmount,
            clearedAgainstCredexDenomination
          )} ${clearedAgainstCredexDenomination}`,
          clearedAgainstCounterpartyAccountName,
        };
      });

    logDebug(`Exiting GetCredexService`, { credexID, accountID });
    return { credexData, clearedAgainstData };
  } catch (error) {
    logError(`Error in GetCredexService:`, error as Error, { credexID, accountID });
    throw error;
  } finally {
    await ledgerSpaceSession.close();
  }
}
