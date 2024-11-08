import { Session, Record } from "neo4j-driver";
import logger from "../../../utils/logger";
import { AvatarData } from "./types";

/**
 * Retrieves active recurring avatars from the database
 */
export async function getActiveRecurringAvatars(
  session: Session
): Promise<AvatarData[]> {
  logger.debug("Querying for active recurring avatars");
  const result = await session.run(`
    MATCH (daynode:Daynode {Active: true})
    MATCH
      (issuer:Account)-[rel1:ACTIVE]->
      (avatar:Avatar { avatarType: "RECURRING", nextPayDate: daynode.Date})-[rel2:ACTIVE]->
      (acceptor:Account)
    MATCH
      (issuer)<-[authRel1:AUTHORIZED_FOR]-
      (avatar)-[authRel2:AUTHORIZED_FOR]->
      (counterparty)
    WITH daynode, issuer, avatar, acceptor, rel1, rel2, authRel1, authRel2
    
    // Reduce remainingPays by 1 if it exists
    SET avatar.remainingPays = 
      CASE
        WHEN avatar.remainingPays IS NOT NULL THEN avatar.remainingPays - 1
        ELSE null
      END
    
    // Calculate the new nextPayDate
    WITH daynode, issuer, avatar, acceptor, rel1, rel2, authRel1, authRel2,
         CASE
           WHEN avatar.remainingPays IS NULL OR avatar.remainingPays > 0 
           THEN date(avatar.nextPayDate) + duration({days: avatar.daysBetweenPays})
           ELSE null
         END AS newNextPayDate
    
    // Update nextPayDate
    SET avatar.nextPayDate = newNextPayDate
    
    WITH daynode, issuer, avatar, acceptor, rel1, rel2, authRel1, authRel2, newNextPayDate
    
    // Check if the avatar should be marked as completed
    OPTIONAL MATCH (issuer)-[completed1:COMPLETED]->(avatar)-[completed2:COMPLETED]->(acceptor)
    FOREACH(ignoreMe IN CASE WHEN newNextPayDate IS NULL AND completed1 IS NULL
             THEN [1] ELSE [] END |
      DELETE rel1, rel2
      SET
        authRel1.markedToDelete = true,
        authRel2.markedToDelete = true
      CREATE (issuer)-[:COMPLETED]->(avatar)-[:COMPLETED]->(acceptor)
    )
    
    RETURN
      avatar {
        .*,
        remainingPays: avatar.remainingPays,
        nextPayDate: avatar.nextPayDate
      } AS avatar,
      issuer.accountID AS issuerAccountID,
      acceptor.accountID AS acceptorAccountID,
      daynode.Date AS Date    
  `);

  return result.records.map((record: Record) => ({
    avatar: record.get("avatar"),
    issuerAccountID: record.get("issuerAccountID"),
    acceptorAccountID: record.get("acceptorAccountID"),
    date: record.get("Date"),
  }));
}

/**
 * Deletes marked avatar authorizations
 */
export async function deleteMarkedAuthorizations(
  session: Session,
  requestId: string,
  avatarId: string
): Promise<void> {
  logger.debug("Deleting marked avatar authorizations", {
    requestId,
    avatarId,
  });
  const deleteResult = await session.run(`
    MATCH ()-[rel:AUTHORIZED_FOR {markedToDelete: true}]->()
    DELETE rel
  `);
  logger.debug("Deleted marked avatar authorizations", {
    requestId,
    avatarId,
    deletedCount: deleteResult.summary.counters.updates().relationshipsDeleted,
  });
}
