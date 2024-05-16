import { Member } from "../types/Member";
import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function UpdateMemberService(data: Member) {
  const ledgerSpaceSession = ledgerSpaceDriver.session()
  const updateQuery = await ledgerSpaceSession.run(
    `
        MATCH (member:Member{memberID:$memberID})
        SET member += $data
        RETURN member.memberID as memberID
        `,
    {
      ...data,
    }
  );
  await ledgerSpaceSession.close(); 
  return updateQuery.records[0].get("memberID");
}
