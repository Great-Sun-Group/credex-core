import { ledgerSpaceDriver } from "../../../config/neo4j";

export async function GetAccountByHandleService(
  accountHandle: string
): Promise<any | null> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  if (!accountHandle) {
    console.log("accountHandle is required");
    return null;
  }

  try {
    const result = await ledgerSpaceSession.run(
      `
            MATCH (account:Account { accountHandle: $accountHandle })
            RETURN
              account.accountID AS accountID,
              account.accountName AS accountName
        `,
      { accountHandle }
    );

    if (!result.records.length) {
      console.log("account not found");
      return null;
    }

    const accountID = result.records[0].get("accountID");
    const accountName = result.records[0].get("accountName");

    return {
      accountID: accountID,
      accountName: accountName,
    };
  } catch (error) {
    console.error("Error fetching account data:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
