"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAccountService = CreateAccountService;
const neo4j_1 = require("../../../../config/neo4j");
const errorUtils_1 = require("../../../utils/errorUtils");
const logger_1 = require("../../../utils/logger");
async function CreateAccountService(ownerID, accountType, accountName, accountHandle, defaultDenom, DCOgiveInCXX = null, DCOdenom = null) {
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    //check that account creation is permitted on membership tier
    const getMemberTier = await ledgerSpaceSession.run(`
        MATCH (member:Member{ memberID: $ownerID })
        OPTIONAL MATCH (member)-[:OWNS]->(account:Account)
        RETURN
          member.memberTier AS memberTier,
          COUNT(account) AS numAccounts
      `, { ownerID });
    const memberTier = getMemberTier.records[0].get("memberTier");
    const numAccounts = getMemberTier.records[0].get("numAccounts");
    if (memberTier <= 2 && numAccounts >= 1) {
        return {
            account: false,
            message: "You cannot create an account on the Open or Verified membership tiers.",
        };
    }
    try {
        const result = await ledgerSpaceSession.run(`
        MATCH (daynode:Daynode { Active: true })
        MATCH (owner:Member { memberID: $ownerID })
        CREATE (owner)-[:OWNS]->(account:Account {
          accountType: $accountType,
          accountName: $accountName,
          accountHandle: $accountHandle,
          defaultDenom: $defaultDenom,
          DCOgiveInCXX: $DCOgiveInCXX,
          DCOdenom: $DCOdenom,
          accountID: randomUUID(),
          queueStatus: "PENDING_ACCOUNT",
          createdAt: datetime(),
          updatedAt: datetime()
        })-[:CREATED_ON]->(daynode)
        CREATE
          (owner)-[:AUTHORIZED_FOR]->
          (account)
          -[:SEND_OFFERS_TO]->(owner)
        RETURN account.accountID AS accountID
      `, {
            ownerID,
            accountType,
            accountName,
            accountHandle,
            defaultDenom,
            DCOgiveInCXX,
            DCOdenom,
        });
        if (!result.records.length) {
            const message = "could not create account";
            (0, logger_1.logInfo)(message);
            return { account: false, message };
        }
        const createdAccountID = result.records[0].get("accountID");
        (0, logger_1.logInfo)(`${accountType} account created: ${createdAccountID}`);
        return {
            accountID: createdAccountID,
            message: "account created",
        };
    }
    catch (error) {
        (0, logger_1.logError)("Error creating account", error);
        if ((0, errorUtils_1.isNeo4jError)(error) &&
            error.code === "Neo.ClientError.Schema.ConstraintValidationFailed") {
            if (error.message.includes("phone")) {
                return { account: false, message: "Phone number already in use" };
            }
            if (error.message.includes("handle")) {
                return {
                    account: false,
                    message: "Sorry, that handle is already in use",
                };
            }
            return { account: false, message: "Required unique field not unique" };
        }
        return {
            account: false,
            message: "Error: " + (error instanceof Error ? error.message : "Unknown error"),
        };
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=CreateAccount.js.map