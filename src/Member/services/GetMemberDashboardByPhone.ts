import { ledgerSpaceDriver } from "../../../config/neo4j";

export async function GetMemberDashboardByPhoneService(phone: string) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
      MATCH (member:Member { phone: $phone })
      OPTIONAL MATCH (member)-[:AUTHORIZED_FOR]->(account:Account)
      WITH member, COLLECT(account.accountID) AS accountIDs
      RETURN
        member.memberID AS memberID,
        member.firstname AS firstname,
        member.lastname AS lastname,
        member.memberHandle AS memberHandle,
        member.defaultDenom AS defaultDenom,
        accountIDs AS accountIDS
      `,
      { phone }
    );

    if (!result.records.length) {
      console.log("member not found by phone");
      return false;
    }

    return {
      memberID: result.records[0].get("memberID"),
      firstname: result.records[0].get("firstname"),
      lastname: result.records[0].get("lastname"),
      memberHandle: result.records[0].get("memberHandle"),
      defaultDenom: result.records[0].get("defaultDenom"),
      accountIDS: result.records[0].get("accountIDS"),
    };
  } catch (error) {
    console.error("Error fetching account data:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}