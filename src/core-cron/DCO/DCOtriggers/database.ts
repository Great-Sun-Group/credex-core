import { Session, Transaction, Record as Neo4jRecord } from "neo4j-driver";
import { TriggerContext, MemberTierUpdate } from "./types";
import logger from "../../../utils/logger";

/**
 * Updates member tiers based on subscription payment status
 * Processes all members with active MEMBERTIER_SUBSCRIPTION templates
 * and updates their tier based on payment status over the last 28 days
 */
export async function updateMemberTiers(
  context: TriggerContext
): Promise<MemberTierUpdate[]> {
  const { session, requestId } = context;
  logger.debug("Starting member tier update process", { requestId });

  try {
    const result = await session.executeWrite(async (tx: Transaction) => {
      const query = `
        MATCH (member:Member)-[OWNS]->(account:Account)
          -[:ACTIVE|INACTIVE]->(subscriptionRec:Recurring { 
            templateType: "MEMBERTIER_SUBSCRIPTION" 
          })-[:SIGNED]->(memberTierPayment:Credex)
          -[:CREATED_ON]->(daynode:Daynode)
        WHERE daynode.Date >= date() - duration('P28D')
        WITH member, member.memberTier as previousTier,
             sum(memberTierPayment.InitialAmount / daynode.USD) as currentPay
        WITH member, previousTier,
             CASE WHEN currentPay >= 1 THEN 3 ELSE 1 END as newTier
        WHERE previousTier <> newTier OR previousTier IS NULL
        SET member.memberTier = newTier
        RETURN 
          member.memberID as memberId,
          COALESCE(previousTier, 1) as previousTier,
          newTier,
          CASE 
            WHEN newTier > COALESCE(previousTier, 1) THEN 'UPGRADE'
            ELSE 'DOWNGRADE_PAYMENT_REQUIREMENT'
          END as reason
      `;

      return tx.run(query);
    });

    const updates: MemberTierUpdate[] = result.records.map((record: Neo4jRecord) => ({
      memberId: record.get('memberId'),
      previousTier: record.get('previousTier').toNumber(),
      newTier: record.get('newTier').toNumber(),
      reason: record.get('reason')
    }));

    if (updates.length > 0) {
      logger.info(`Updated ${updates.length} member tiers`, { 
        requestId,
        updates: updates.map(u => ({
          memberId: u.memberId,
          tierChange: `${u.previousTier} -> ${u.newTier}`,
          reason: u.reason
        }))
      });
    } else {
      logger.debug("No member tier updates required", { requestId });
    }

    return updates;
  } catch (error) {
    logger.error("Error updating member tiers", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });
    throw error;
  }
}
