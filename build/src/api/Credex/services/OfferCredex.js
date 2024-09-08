"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferCredexService = OfferCredexService;
const CreateCredex_1 = require("./CreateCredex");
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = require("../../../utils/logger");
/**
 * OfferCredexService
 *
 * This service handles the creation of a new Credex offer.
 * It uses the CreateCredexService to create the Credex and then
 * signs the offer and prepares it for notification.
 *
 * @param credexData - An object containing the data for the new Credex
 * @returns The result of the Credex offer creation
 */
async function OfferCredexService(credexData) {
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    try {
        // Set default values for the Credex
        credexData.OFFERSorREQUESTS = "OFFERS";
        credexData.credexType = credexData.credexType || "PURCHASE";
        // Create the new Credex
        const newCredex = await (0, CreateCredex_1.CreateCredexService)(credexData);
        if (typeof newCredex.credex === "boolean" || !newCredex.credex?.credexID) {
            throw new Error("Failed to create Credex");
        }
        // Sign the Credex and prepare for notification
        const signResult = await signCredex(ledgerSpaceSession, newCredex.credex.credexID, credexData.memberID);
        if (!signResult) {
            (0, logger_1.logWarning)("Failed to sign Credex, but Credex was created successfully");
        }
        // TODO: Implement offer notification here
        (0, logger_1.logInfo)(newCredex.message);
        return newCredex;
    }
    catch (error) {
        (0, logger_1.logError)("Error offering credex", error);
        throw error;
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
async function signCredex(session, credexID, signingMemberID) {
    try {
        const signQuery = await session.run(`
      MATCH
        (credex:Credex { credexID: $credexID })<-[:OFFERS]-
        (Account)<-[:AUTHORIZED_FOR]-
        (signer:Member|Avatar { memberID: $signingMemberID })
      CREATE (credex)<-[:SIGNED]-(signer)
      RETURN signer.memberID AS signerID
      `, { credexID, signingMemberID });
        return signQuery.records.length > 0;
    }
    catch (error) {
        (0, logger_1.logError)("Error signing Credex", error);
        return false;
    }
}
//# sourceMappingURL=OfferCredex.js.map