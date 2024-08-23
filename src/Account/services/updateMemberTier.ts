import { ledgerSpaceDriver } from "../../../config/neo4j";
import * as neo4j from "neo4j-driver";

export async function UpdateMemberTier(
  memberIDtoUpdate: string,
  newTier: number
) {
  if (newTier < 1 || newTier > 5) {
    return {
      message: "New member tier is not a valid value",
    };
  }
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH (member:Member { memberID: $memberIDtoUpdate })
        SET member.memberTier = $newTier
        RETURN
          member.memberID AS memberIDupdated
      `,
      {
        memberIDtoUpdate,
        newTier: neo4j.int(newTier),
      }
    );

    if (!result.records.length) {
      return false;
    }

    const record = result.records[0];

    if (record.get("memberIDupdated")) {
      console.log("Member tier for " + memberIDtoUpdate + " set to " + newTier);
      return true;
    } else {
      console.log("could not authorize account");
      return false;
    }
  } catch (error) {
    console.error("Error updating member tier: ", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
