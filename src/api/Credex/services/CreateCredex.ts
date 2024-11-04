import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import { GetSecuredAuthorizationService } from "./GetSecuredAuthorization";
import { logDebug, logInfo, logWarning, logError } from "../../../utils/logger";
import { digitallySign } from "../../../utils/digitalSignature";

export async function CreateCredexService(credexData: any) {
  logDebug(`Entering CreateCredexService`, { credexData });

  const {
    memberID,
    issuerAccountID,
    receiverAccountID,
    InitialAmount,
    Denomination,
    credexType,
    OFFERSorREQUESTS,
    securedCredex = false,
    dueDate = "",
    requestId = "",
  } = credexData;

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  let OFFEREDorREQUESTED = OFFERSorREQUESTS === "OFFERS" ? "OFFERED" : "REQUESTED";

  try {
    // Get securable data for secured credex
    let secureableData = { securerID: "", securableAmountInDenom: 0 };
    if (securedCredex) {
      logDebug(`Attempting to get secured authorization`, { issuerAccountID, Denomination });
      secureableData = await GetSecuredAuthorizationService(
        issuerAccountID,
        Denomination
      );
      if (secureableData.securableAmountInDenom < InitialAmount) {
        logWarning(`Insufficient securable amount for secured credex`, { 
          issuerAccountID, 
          InitialAmount, 
          Denomination, 
          securableAmountInDenom: secureableData.securableAmountInDenom 
        });
        return {
          credex: false,
          message: `Error: Your secured credex for ${denomFormatter(
            InitialAmount,
            Denomination
          )} ${Denomination} cannot be issued because your maximum securable ${Denomination} balance is ${denomFormatter(
            secureableData.securableAmountInDenom,
            Denomination
          )} ${Denomination}`,
        };
      }
    }

    // Create the credex
    logDebug(`Attempting to create credex in database`, { 
      issuerAccountID, 
      receiverAccountID, 
      InitialAmount, 
      Denomination, 
      credexType 
    });
    const createCredexQuery = await ledgerSpaceSession.run(
      `
        MATCH (daynode:Daynode {Active: true})
        MATCH (issuer:Account {accountID: $issuerAccountID})
        MATCH (receiver:Account {accountID: $receiverAccountID})
        CREATE (newCredex:Credex)
        SET
          newCredex.credexID = randomUUID(),
          newCredex.Denomination = $Denomination,
          newCredex.CXXmultiplier = daynode[$Denomination],
          newCredex.InitialAmount = $InitialAmount * daynode[$Denomination],
          newCredex.OutstandingAmount = $InitialAmount * daynode[$Denomination],
          newCredex.RedeemedAmount = 0,
          newCredex.DefaultedAmount = 0,
          newCredex.WrittenOffAmount = 0,
          newCredex.credexType = $credexType,
          newCredex.createdAt = datetime(),
          newCredex.queueStatus = "PENDING_CREDEX"
        MERGE (newCredex)-[:CREATED_ON]->(daynode)
        MERGE (issuer)-[:${OFFERSorREQUESTS}]->(newCredex)-[:${OFFERSorREQUESTS}]->(receiver)
        MERGE (issuer)-[:${OFFEREDorREQUESTED}]->(newCredex)-[:${OFFEREDorREQUESTED}]->(receiver)
        RETURN
          newCredex.credexID AS credexID,
          receiver.accountName AS receiverAccountName,
          issuer.accountID AS issuerAccountID,
          daynode[$Denomination] AS cxxMultiplier
      `,
      {
        issuerAccountID,
        receiverAccountID,
        InitialAmount,
        Denomination,
        credexType,
      }
    );

    const credexID = createCredexQuery.records[0].get("credexID");
    const cxxMultiplier = createCredexQuery.records[0].get("cxxMultiplier");
    logInfo(`Credex created successfully`, { credexID });

    // Add dueDate for unsecured credex
    if (!securedCredex) {
      logDebug(`Adding due date for unsecured credex`, { credexID, dueDate });
      const addDueDateQuery = await ledgerSpaceSession.run(
        `
          MATCH (newCredex:Credex {credexID: $credexID})
          SET newCredex.dueDate = date($dueDate)
          RETURN newCredex.dueDate AS dueDate
        `,
        {
          credexID,
          dueDate,
        }
      );
      if (addDueDateQuery.records.length === 0) {
        logError(`Failed to add due date for credex`, new Error("No records returned"), { credexID, dueDate });
        return { credex: false, message: "error creating credex" };
      }
    }

    // Add secured relationships for secured credex
    if (securedCredex && secureableData.securerID) {
      logDebug(`Adding secured relationship for credex`, { credexID, securerID: secureableData.securerID });
      await ledgerSpaceSession.run(
        `
          MATCH (newCredex:Credex {credexID: $credexID})
          MATCH (securingAccount: Account {accountID: $securingAccountID})
          MERGE (securingAccount)-[:SECURES]->(newCredex)
        `,
        {
          credexID,
          securingAccountID: secureableData.securerID,
        }
      );
    }

    const newCredex = {
      credexID: createCredexQuery.records[0].get("credexID"),
      formattedInitialAmount: denomFormatter(InitialAmount, Denomination),
      counterpartyAccountName: createCredexQuery.records[0].get(
        "receiverAccountName"
      ),
      secured: securedCredex,
      dueDate: dueDate,
    };

    // Create digital signature
    try {
      logDebug(`Creating digital signature for credex`, { credexID, memberID });
      const inputData = JSON.stringify({
        credexID,
        issuerAccountID,
        receiverAccountID,
        InitialAmount,
        Denomination,
        credexType,
        OFFERSorREQUESTS,
        securedCredex,
        dueDate,
        cxxMultiplier,
        createdAt: new Date().toISOString()
      });

      await digitallySign(
        ledgerSpaceSession,
        memberID,
        "Credex",
        credexID,
        "CREATE_CREDEX",
        inputData,
        requestId
      );

      logDebug(`Digital signature created successfully`, { credexID });
    } catch (error) {
      logError(`Digital signature error for credexID ${credexID}`, error as Error, { credexID, memberID });
      throw new Error(`Digital signature error: ${(error as Error).message}`);
    }

    logInfo(`Credex creation completed`, { credexID: newCredex.credexID });
    return {
      credex: newCredex,
      message: "Credex created: " + newCredex.credexID,
    };
  } catch (error) {
    logError(`Error creating credex`, error as Error, { credexData });
    return { credex: false, message: "Error creating credex: " + (error as Error).message };
  } finally {
    await ledgerSpaceSession.close();
    logDebug(`Exiting CreateCredexService`);
  }
}
