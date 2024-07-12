/*
requires
  credexID
  accountID

returns
  formatted credex data
  formatted data for each clearedAgainst credex, if any

*/

import { ledgerSpaceDriver } from "../../Admin/config/neo4j";
import { denomFormatter } from "../../Core/constants/denominations";
import { GetDisplayNameService } from "../../Account/services/GetDisplayNameService";
import { Credex } from "../types/Credex";
import moment from "moment-timezone";

export async function GetCredexService(credexID: string, accountID: string) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
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
        counterparty.firstname AS counterpartyFirstname,
        counterparty.lastname AS counterpartyLastname,
        counterparty.companyname AS counterpartyCompanyname,
        counterparty.accountType AS counterpartyAccountType,
        securer.accountID AS securerID,
        securer.companyname AS securerName,
        credex.Denomination AS Denomination,
        credex.InitialAmount / credex.CXXmultiplier AS InitialAmount,
        credex.OutstandingAmount / credex.CXXmultiplier AS OutstandingAmount,
        credex.RedeemedAmount / credex.CXXmultiplier AS RedeemedAmount,
        credex.DefaultedAmount / credex.CXXmultiplier AS DefaultedAmount,
        credex.WrittenOffAmount / credex.CXXmultiplier AS WrittenOffAmount,
        credex.acceptedAt AS acceptedAt,
        credex.dueDate AS dueDate,
        clearedAgainstCredex.credexID AS clearedAgainstCredexID,
        credloopRel.AmountRedeemed / credloopRel.CXXmultiplier AS clearedAmount,
        clearedAgainstCredex.InitialAmount / clearedAgainstCredex.CXXmultiplier AS clearedAgainstCredexInitialAmount,
        clearedAgainstCredex.Denomination AS clearedAgainstCredexDenomination,
        clearedAgainstCounterparty.firstname AS clearedAgainstCounterpartyFirstname,
        clearedAgainstCounterparty.lastname AS clearedAgainstCounterpartyLastname,
        clearedAgainstCounterparty.companyname AS clearedAgainstCounterpartyCompanyname,
        clearedAgainstCounterparty.accountType AS clearedAgainstCounterpartyAccountType
      `,
      { credexID, accountID }
    );

    if (result.records.length === 0) {
      throw new Error("No records found");
    }

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

    const acceptedAt = moment(record.get("acceptedAt"))
      .subtract(1, "month")
      .format("YYYY-MM-DD");
    const dueDate = moment(record.get("dueDate"))
      .subtract(1, "month")
      .format("YYYY-MM-DD");
    const counterpartyDisplayname = GetDisplayNameService({
      accountType: record.get("counterpartyAccountType"),
      firstname: record.get("counterpartyFirstname"),
      lastname: record.get("counterpartyLastname"),
      companyname: record.get("counterpartyCompanyname"),
    });

    const credexData: Credex = {
      credexID: record.get("credexID"),
      transactionType: record.get("transactionType"),
      debit,
      counterpartyDisplayname,
      securerID: record.get("securerID"),
      securerName: record.get("securerName"),
      Denomination,
      acceptedAt: acceptedAt,
      dueDate: dueDate,
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

        const clearedAgainstCounterpartyDisplayname = GetDisplayNameService({
          accountType: record.get("clearedAgainstCounterpartyAccountType"),
          firstname: record.get("clearedAgainstCounterpartyFirstname"),
          lastname: record.get("clearedAgainstCounterpartyLastname"),
          companyname: record.get("clearedAgainstCounterpartyCompanyname"),
        });

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
          clearedAgainstCounterpartyDisplayname,
        };
      });

    return { credexData, clearedAgainstData };
  } catch (error) {
    console.error("Error in GetCredexService:", error);
    throw error;
  } finally {
    await ledgerSpaceSession.close();
  }
}
