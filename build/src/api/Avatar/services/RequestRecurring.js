"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestRecurringService = RequestRecurringService;
const neo4j_1 = require("../../../../config/neo4j");
const neo4j = __importStar(require("neo4j-driver"));
const digitalSignature_1 = require("../../../utils/digitalSignature");
async function RequestRecurringService(params) {
  const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
  try {
    let cypher = `
      MATCH
        (requestor:Account {accountID: $requestorAccountID})<-[:AUTHORIZED_FOR]-
        (signer:Member|Avatar { memberID: $signerMemberID })
      MATCH (counterparty:Account {accountID: $counterpartyAccountID})
      MATCH (daynode:Daynode { Active: true })
      CREATE (recurring:Avatar)
      SET
        recurring.avatarType = "RECURRING",
        recurring.memberID = randomUUID(),
        recurring.Denomination = $Denomination,
        recurring.InitialAmount = $InitialAmount,
        recurring.nextPayDate = date($nextPayDate),
        recurring.daysBetweenPays = $daysBetweenPays,
        recurring.createdAt = datetime(),
        recurring.memberTier = 3
    `;
    if (params.securedCredex !== undefined) {
      cypher += `SET recurring.securedCredex = $securedCredex `;
    }
    if (params.credspan !== undefined) {
      cypher += `SET recurring.credspan = $credspan `;
    }
    if (params.remainingPays !== undefined) {
      cypher += `SET recurring.remainingPays = $remainingPays `;
    }
    cypher += `
      CREATE (requestor)<-[:REQUESTS]-(recurring)<-[:REQUESTS]-(counterparty)
      CREATE (requestor)<-[:REQUESTED]-(recurring)<-[:REQUESTED]-(counterparty)
      CREATE (requestor)<-[:AUTHORIZED_FOR]-(recurring)
      CREATE (recurring)-[:CREATED_ON]--(daynode)
      RETURN
        recurring.memberID AS avatarID
    `;
    const neo4jParams = {
      ...params,
      daysBetweenPays: neo4j.int(params.daysBetweenPays),
      credspan: params.credspan ? neo4j.int(params.credspan) : undefined,
      remainingPays: params.remainingPays
        ? neo4j.int(params.remainingPays)
        : undefined,
    };
    const createRecurringQuery = await ledgerSpaceSession.run(
      cypher,
      neo4jParams
    );
    const avatarID = createRecurringQuery.records[0]?.get("avatarID");
    if (avatarID) {
      // Create digital signature
      await (0, digitalSignature_1.digitallySign)(
        ledgerSpaceSession,
        params.signerMemberID,
        "Avatar",
        avatarID
      );
    }
    return avatarID || null;
  } catch (error) {
    console.error("Error creating recurring avatar:", error);
    return null;
  } finally {
    await ledgerSpaceSession.close();
  }
}
//# sourceMappingURL=RequestRecurring.js.map
