import { ledgerSpaceDriver } from "../../../config/neo4j";

export async function GetMemberByHandleService(
  memberHandle: string
): Promise<any | null> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  if (!memberHandle) {
    console.log("memberHandle is required");
    return null;
  }

  try {
    const result = await ledgerSpaceSession.run(
      `
            MATCH (member:Member { memberHandle: $memberHandle })
            RETURN
              member.memberID AS memberID,
              member.firstname AS firstname,
              member.lastname AS lastname
        `,
      { memberHandle }
    );

    if (!result.records.length) {
      console.log("member not found");
      return null;
    }

    const memberID = result.records[0].get("memberID");
    const firstname = result.records[0].get("firstname");
    const lastname = result.records[0].get("lastname");

    return {
      memberID: memberID,
      memberName: firstname + " " + lastname,
    };
  } catch (error) {
    console.error("Error fetching member data:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
