import { ledgerSpaceDriver } from "../../config/neo4j";
import { v4 as uuidv4 } from 'uuid';
import { CreateCredexService } from "../api/Credex/services/CreateCredex";
import { logInfo, logError } from "../utils/logger";

async function sendSecuredCredexForDev() {
  const receiverHandle = "23729624032";
  const amount = 50;
  const denomination = "USD";
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Get receiver account details directly from the database
    const accountResult = await ledgerSpaceSession.run(
      `MATCH (account:Account {accountHandle: $receiverHandle})
       RETURN account.accountID AS accountID`,
      { receiverHandle }
    );

    if (accountResult.records.length === 0) {
      throw new Error(`Receiver account not found for handle: ${receiverHandle}`);
    }

    const receiverAccountID = accountResult.records[0].get('accountID');

    // For development, we'll use a hardcoded issuer account ID
    // Make sure this account exists in your development database
    const issuerAccountID = "2ccd542c-6bc6-4e54-aec6-417721125ea6";

    const credexData = {
      credexID: uuidv4(), // Generate a new UUID for the credex
      issuerAccountID: issuerAccountID,
      receiverAccountID: receiverAccountID,
      Denomination: denomination,
      InitialAmount: amount,
      OutstandingAmount: amount,
      credexType: "PURCHASE",
      OFFERSorREQUESTS: "OFFERS",
      securedCredex: true,
      CXXmultiplier: 1, // Assuming 1:1 for simplicity, adjust as needed
      queueStatus: "PENDING",
      createdAt: new Date().toISOString(),
    };

    logInfo("Creating secured credex for development", {
      issuerAccountID,
      receiverAccountID,
      amount,
      denomination
    });

    const createResult = await CreateCredexService(credexData);

    if (createResult && createResult.credex && typeof createResult.credex !== 'boolean') {
      logInfo("Secured credex created successfully", {
        credexID: createResult.credex.credexID,
        amount,
        denomination
      });
    } else {
      throw new Error("Failed to create secured credex");
    }

  } catch (error) {
    logError("Error in sendSecuredCredexForDev", error as Error);
  } finally {
    await ledgerSpaceSession.close();
  }
}

sendSecuredCredexForDev();
