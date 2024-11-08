import { authRequest } from "../utils/request";
import { loginMember } from "../utils/auth";
import { delay, DELAY_MS } from "../utils/delay";

// Get operation and params from environment variables
const operation = process.env.TEST_OPERATION || '';
const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);

type CredexOperation = 
  | "createCredex"
  | "acceptCredex"
  | "acceptCredexBulk"
  | "declineCredex"
  | "cancelCredex"
  | "getCredex";

// Operation parameter definitions
const operationParams: Record<CredexOperation, string[]> = {
  createCredex: ["phone", "issuerAccountID", "receiverAccountID", "Denomination", "InitialAmount", "credexType", "OFFERSorREQUESTS", "securedCredex"],
  acceptCredex: ["phone", "credexID"],
  acceptCredexBulk: ["phone", "credexIDs"],
  declineCredex: ["phone", "credexID"],
  cancelCredex: ["phone", "credexID"],
  getCredex: ["phone", "credexID"]
};

describe("Credex Endpoint Tests", () => {
  // Store auth data
  let jwt = "";
  let memberID = "";

  // Login before tests if needed
  beforeAll(async () => {
    if (!params[0]) {
      throw new Error("Phone number required");
    }
    const auth = await loginMember(params[0]);
    jwt = auth.jwt;
    memberID = auth.memberID;
  });

  describe(operation, () => {
    (operation === "createCredex" ? it : it.skip)("createCredex", async () => {
      const [, issuerAccountID, receiverAccountID, Denomination, InitialAmount, credexType, OFFERSorREQUESTS, securedCredex] = params;
      if (!issuerAccountID || !receiverAccountID || !Denomination || !InitialAmount || !credexType || !OFFERSorREQUESTS) {
        throw new Error("Usage: npm test credex createCredex <phone> <issuerAccountID> <receiverAccountID> <Denomination> <InitialAmount> <credexType> <OFFERSorREQUESTS> [securedCredex]");
      }

      console.log("\nCreating credex...");
      const response = await authRequest("/createCredex", {
        memberID,
        issuerAccountID,
        receiverAccountID,
        Denomination,
        InitialAmount: Number(InitialAmount),
        credexType,
        OFFERSorREQUESTS,
        securedCredex: securedCredex === "true"
      }, jwt);
      console.log("Create credex response:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    (operation === "acceptCredex" ? it : it.skip)("acceptCredex", async () => {
      const [, credexID] = params;
      if (!credexID) {
        throw new Error("Usage: npm test credex acceptCredex <phone> <credexID>");
      }

      console.log("\nAccepting credex...");
      const response = await authRequest("/acceptCredex", {
        credexID: credexID,
        signerID: memberID
      }, jwt);
      console.log("Accept credex response:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    (operation === "acceptCredexBulk" ? it : it.skip)("acceptCredexBulk", async () => {
      const [, credexIDsStr] = params;
      if (!credexIDsStr) {
        throw new Error("Usage: npm test credex acceptCredexBulk <phone> <credexIDs> (comma-separated list)");
      }

      console.log("\nAccepting credexes in bulk...");
      const credexIDs = credexIDsStr.split(",");
      const response = await authRequest("/acceptCredexBulk", {
        credexIDs,
        signerID: memberID
      }, jwt);
      console.log("Accept bulk response:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    (operation === "declineCredex" ? it : it.skip)("declineCredex", async () => {
      const [, credexID] = params;
      if (!credexID) {
        throw new Error("Usage: npm test credex declineCredex <phone> <credexID>");
      }

      console.log("\nDeclining credex...");
      const response = await authRequest("/declineCredex", {
        credexID: credexID,
        signerID: memberID
      }, jwt);
      console.log("Decline credex response:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    (operation === "cancelCredex" ? it : it.skip)("cancelCredex", async () => {
      const [, credexID] = params;
      if (!credexID) {
        throw new Error("Usage: npm test credex cancelCredex <phone> <credexID>");
      }

      console.log("\nCancelling credex...");
      const response = await authRequest("/cancelCredex", {
        credexID: credexID,
        signerID: memberID
      }, jwt);
      console.log("Cancel credex response:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    (operation === "getCredex" ? it : it.skip)("getCredex", async () => {
      const [, credexID] = params;
      if (!credexID) {
        throw new Error("Usage: npm test credex getCredex <phone> <credexID>");
      }

      console.log("\nGetting credex...");
      const response = await authRequest("/getCredex", {
        credexID: credexID
      }, jwt);
      console.log("Credex data:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });
  });
});
