import { ledgerSpaceDriver } from "../../../config/neo4j";
import { Session, Record } from "neo4j-driver";
import { CreateCredexService } from "../../api/Credex/services/CreateCredex";
import { AcceptCredexService } from "../../api/Credex/services/AcceptCredex";
import moment from "moment-timezone";
import logger from "../../utils/logger";
import { v4 as uuidv4 } from "uuid";

interface Avatar {
  memberID: string;
  Denomination: string;
  InitialAmount: number;
  securedCredex: boolean;
  credspan: string;
  remainingPays: number | null;
  nextPayDate: string | null;
  dueDate?: string;
}

interface CredexOfferResult {
  credex: {
    credexID: string;
  };
}

interface AvatarData {
  avatar: Avatar;
  issuerAccountID: string;
  acceptorAccountID: string;
  date: string;
}

/**
 * DCOavatars function
 * This function is run as a cronjob every 24 hours to process recurring avatars.
 * It identifies active recurring avatars, creates credexes, and updates their status.
 */
export async function DCOavatars(): Promise<void> {
  logger.info("Starting DCOavatars process");
  const ledgerSpaceSession: Session = ledgerSpaceDriver.session();

  try {
    const activeAvatars = await getActiveRecurringAvatars(ledgerSpaceSession);
    logger.info(`Found ${activeAvatars.length} active recurring avatars`);

    for (const avatarData of activeAvatars) {
      await processAvatar(ledgerSpaceSession, avatarData);
    }
  } catch (error) {
    logger.error("Error in DCOavatars", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
  } finally {
    logger.debug("Closing ledgerSpace session");
    await ledgerSpaceSession.close();
    logger.info("DCOavatars process completed");
  }
}

async function getActiveRecurringAvatars(
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
    avatar: record.get("avatar") as Avatar,
    issuerAccountID: record.get("issuerAccountID") as string,
    acceptorAccountID: record.get("acceptorAccountID") as string,
    date: record.get("Date") as string,
  }));
}

async function processAvatar(
  session: Session,
  avatarData: AvatarData
): Promise<void> {
  const { avatar, issuerAccountID, acceptorAccountID, date } = avatarData;
  const requestId = uuidv4();
  logger.debug(`Processing avatar ${avatar.memberID}`, {
    requestId,
    avatarId: avatar.memberID,
  });

  try {
    const offerData = prepareOfferData(
      avatar,
      issuerAccountID,
      acceptorAccountID,
      date,
      requestId
    );
    const offerResult = await createCredexOffer(offerData);

    if (offerResult && offerResult.credex && offerResult.credex.credexID) {
      await acceptCredexOffer(
        offerResult.credex.credexID,
        avatar.memberID,
        requestId
      );
      logger.info(
        `Successfully created and accepted credex for recurring avatar`,
        {
          requestId,
          avatarId: avatar.memberID,
          remainingPays: avatar.remainingPays,
          nextPayDate: avatar.nextPayDate,
        }
      );
    } else {
      throw new Error(`Failed to create offer for avatar: ${avatar.memberID}`);
    }

    await deleteMarkedAuthorizations(session, requestId, avatar.memberID);
  } catch (error) {
    logger.error(`Error processing avatar`, {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
      avatarId: avatar.memberID,
    });
    // TODO: Implement member notification about the failure
    logger.warn(
      `Placeholder: Notify member about the failure in processing their recurring avatar`,
      { requestId, avatarId: avatar.memberID }
    );
  }
}

function prepareOfferData(
  avatar: Avatar,
  issuerAccountID: string,
  acceptorAccountID: string,
  date: string,
  requestId: string
): any {
  const offerData: any = {
    memberID: avatar.memberID,
    issuerAccountID: issuerAccountID,
    receiverAccountID: acceptorAccountID,
    Denomination: avatar.Denomination,
    InitialAmount: avatar.InitialAmount,
    credexType: "PURCHASE",
    OFFERSorREQUESTS: "OFFERS",
    requestId,
  };

  if (avatar.securedCredex) {
    offerData.securedCredex = true;
  } else {
    offerData.dueDate = moment(date)
      .add(parseInt(avatar.credspan), "days")
      .subtract(1, "month")
      .format("YYYY-MM-DD");
  }

  logger.debug("Prepared credex offer data", {
    requestId,
    avatarId: avatar.memberID,
    offerData,
  });
  return offerData;
}

async function createCredexOffer(offerData: any): Promise<CredexOfferResult> {
  logger.debug("Creating new credex offer", {
    requestId: offerData.requestId,
    avatarId: offerData.memberID,
  });
  const offerResult = await CreateCredexService(offerData);

  if (
    offerResult &&
    typeof offerResult.credex === "object" &&
    offerResult.credex.credexID
  ) {
    logger.info("Credex offer created", {
      requestId: offerData.requestId,
      credexID: offerResult.credex.credexID,
      avatarID: offerData.memberID,
      action: "OFFER_CREDEX",
    });
    return offerResult;
  } else {
    throw new Error(
      `Failed to create credex offer for avatar: ${offerData.memberID}`
    );
  }
}

async function acceptCredexOffer(
  credexID: string,
  avatarMemberID: string,
  requestId: string
): Promise<void> {
  logger.debug("Accepting credex offer", {
    requestId,
    credexID,
    avatarId: avatarMemberID,
  });
  const acceptResult = await AcceptCredexService(
    credexID,
    avatarMemberID,
    requestId
  );

  if (acceptResult) {
    logger.info("Credex accepted", {
      requestId,
      credexID,
      avatarID: avatarMemberID,
      action: "ACCEPT_CREDEX",
    });
  } else {
    throw new Error(`Failed to accept credex for avatar: ${avatarMemberID}`);
  }
}

async function deleteMarkedAuthorizations(
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
