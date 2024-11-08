import { Session } from "neo4j-driver";
import logger from "../utils/logger";

export async function digitallySign(
  session: Session,
  signerID: string,
  entityType: string,
  entityId: string,
  actionType: string,
  inputData: string,
  requestId: string
): Promise<void> {
  logger.debug("Attempting to create digital signature", {
    signerID,
    entityType,
    entityId,
    actionType,
    requestId,
  });
  
  const query = `
    MATCH (daynode:Daynode {Active: true})
    MATCH (signer:Member|Avatar {memberID: $signerID})
    MATCH (entity:${entityType} {${entityType.toLowerCase()}ID: $entityId})
    CREATE
      (signer)-[:SIGNED]->
      (signature:Signature {
        signatureID: apoc.create.uuid(),
        createdAt: datetime(),
        actionType: $actionType,
        inputData: $inputData,
        requestId: $requestId
      })-[:SIGNED]->(entity),
      (signature)-[:CREATED_ON]->(daynode)
  `;

  try {
    await session.run(query, {
      signerID,
      entityId,
      actionType,
      inputData,
      requestId,
    });
    logger.info("Digital signature created successfully", {
      signerID,
      entityType,
      entityId,
      actionType,
      requestId,
    });
  } catch (error) {
    logger.error("Error creating digital signature", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      signerID,
      entityType,
      entityId,
      actionType,
      requestId,
    });
    throw error;
  }
}

export async function getSignerMember(
  session: Session,
  signerID: string
): Promise<string> {
  logger.debug("Attempting to get signer member", { signerID });

  const query = `
    MATCH (signer:Member|Avatar {memberID: $signerID})
    RETURN 
      CASE 
        WHEN signer:Member THEN signer.memberID 
        WHEN signer:Avatar THEN [(signer)<-[:OWNS]-(member:Member) | member.memberID][0]
      END AS memberID
  `;

  try {
    const result = await session.run(query, { signerID });
    const memberID = result.records[0].get("memberID");
    logger.info("Signer member retrieved successfully", { signerID, memberID });
    return memberID;
  } catch (error) {
    logger.error("Error getting signer member", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      signerID,
    });
    throw error;
  }
}
