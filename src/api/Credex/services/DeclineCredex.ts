import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import logger from "../../../utils/logger";

interface DeclineCredexData {
  credexID: string;
  declinedAt: string;
  transactionType: string;
  issuerAccountID: string;
  issuerAccountName: string;
  issuerMemberID: string | null;
  receiverAccountID: string;
  receiverAccountName: string;
  denomination: string;
}

interface DeclineCredexResult {
  success: boolean;
  data?: DeclineCredexData;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

interface DatabaseDeclineResult {
  success: boolean;
  data?: {
    credexID: string;
    declinedAt: string;
    issuerAccountID: string;
    issuerAccountName: string;
    issuerMemberID: string | null;
    receiverAccountID: string;
    receiverAccountName: string;
    denomination: string;
  };
  error?: string;
}

export async function DeclineCredexService(
  credexID: string,
  signerID: string,
  requestId: string
): Promise<DeclineCredexResult> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Check authorization
    const checkResult = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH (member:Member { memberID: $signerID })
        -[:AUTHORIZED_FOR]->(account:Account)
        <-[:OFFERS]-(credex:Credex { credexID: $credexID })
        RETURN account.accountID as receiverAccountID, credex.credexID as credexID

        UNION

        MATCH (member:Member { memberID: $signerID })
        -[:AUTHORIZED_FOR]->(account:Account)
        -[:REQUESTS]->(credex:Credex { credexID: $credexID })
        RETURN account.accountID as receiverAccountID, credex.credexID as credexID
      `;

      const result = await tx.run(query, { credexID, signerID });

      if (result.records.length === 0) {
        return {
          success: false,
          error: "NOT_FOUND"
        };
      }

      const record = result.records[0];
      return {
        success: true,
        receiverAccountID: record.get('receiverAccountID')
      };
    });

    if (!checkResult.success) {
      return {
        success: false,
        message: "Credex not found or already processed",
        error: {
          code: "NOT_FOUND",
          details: "The Credex does not exist, is in wrong state, or you are not authorized"
        }
      };
    }

    // Decline the Credex
    const result: DatabaseDeclineResult = await ledgerSpaceSession.executeWrite(async (tx) => {
      const query = `
        MATCH (source:Account)-[rel1:OFFERS|REQUESTS]->(credex:Credex { credexID: $credexID })-[rel2:OFFERS|REQUESTS]->(target:Account)
        WHERE type(rel1) = type(rel2)
        DELETE rel1, rel2
        CREATE (source)-[:DECLINED]->(credex)-[:DECLINED]->(target)
        SET
          credex.declinedAt = datetime(),
          credex.OutstandingAmount = 0,
          credex.queueStatus = "PROCESSED"
        RETURN 
          credex.credexID AS credexID,
          toString(credex.declinedAt) AS declinedAt,
          source.accountID AS issuerAccountID,
          target.accountID AS receiverAccountID,
          credex.Denomination AS denomination,
          source.accountName AS issuerAccountName,
          target.accountName AS receiverAccountName,
          CASE WHEN exists((source)-[:OWNED_BY]->(:Member)) 
               THEN [(source)-[:OWNED_BY]->(m:Member) | m.memberID][0]
               ELSE null
          END AS issuerMemberID
      `;

      const queryResult = await tx.run(query, { credexID });

      if (queryResult.records.length === 0) {
        return {
          success: false,
          error: "DECLINE_FAILED"
        };
      }

      const record = queryResult.records[0];
      return {
        success: true,
        data: {
          credexID: record.get("credexID"),
          declinedAt: record.get("declinedAt"),
          issuerAccountID: record.get("issuerAccountID"),
          receiverAccountID: record.get("receiverAccountID"),
          denomination: record.get("denomination"),
          issuerAccountName: record.get("issuerAccountName"),
          receiverAccountName: record.get("receiverAccountName"),
          issuerMemberID: record.get("issuerMemberID")
        }
      };
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        message: "Failed to decline Credex",
        error: {
          code: "DECLINE_FAILED",
          details: "An error occurred while attempting to decline the Credex"
        }
      };
    }

    // Create digital signature
    const inputData = JSON.stringify({
      credexID: result.data.credexID,
      declinedAt: result.data.declinedAt,
      issuerAccountID: result.data.issuerAccountID,
      receiverAccountID: result.data.receiverAccountID,
      denomination: result.data.denomination,
      signerID
    });

    await digitallySign(
      ledgerSpaceSession,
      signerID,
      "Credex",
      result.data.credexID,
      "DECLINE_CREDEX",
      inputData,
      requestId
    );

    return {
      success: true,
      data: {
        ...result.data,
        transactionType: "DECLINED"
      },
      message: "Credex declined successfully"
    };

  } catch (error) {
    logger.error("Unexpected error in DeclineCredexService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID,
      signerID,
      requestId
    });

    return {
      success: false,
      message: "Failed to decline Credex",
      error: {
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : "An unknown error occurred while declining the Credex"
      }
    };

  } finally {
    await ledgerSpaceSession.close();
  }
}
