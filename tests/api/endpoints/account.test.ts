import { authRequest } from "../utils/request";
import { loginMember } from "../utils/auth";
import { delay, DELAY_MS } from "../utils/delay";

// Get command line arguments
const args = process.argv.slice(2);
const operation = args[0];
const params = args.slice(1);

type AccountOperation = 
  | "getAccountByHandle"
  | "getLedger";

// Operation parameter definitions
const operationParams: Record<AccountOperation, string[]> = {
  getAccountByHandle: ["phone", "accountHandle"],
  getLedger: ["phone", "accountID"]
};

describe("Account Endpoint Tests", () => {
  // Store auth data
  let jwt = "";
  let memberID = "";

  // Skip all tests except the requested operation
  const runTest = (testName: string) => operation === testName;

  // Login before tests
  beforeAll(async () => {
    const phoneIndex = operationParams[operation as AccountOperation]?.indexOf("phone");
    if (phoneIndex === -1 || !params[phoneIndex]) {
      throw new Error(`Phone number required for ${operation}`);
    }
    const auth = await loginMember(params[phoneIndex]);
    jwt = auth.jwt;
    memberID = auth.memberID;
  });

  test("Get Account By Handle", async () => {
    if (!runTest("getAccountByHandle")) return;
    
    const [, accountHandle] = params;
    if (!accountHandle) {
      throw new Error("Usage: npm test account getAccountByHandle <phone> <accountHandle>");
    }

    const response = await authRequest("/getAccountByHandle", { accountHandle }, jwt);
    console.log("Account data:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });

  test("Get Ledger", async () => {
    if (!runTest("getLedger")) return;
    
    const [, accountID] = params;
    if (!accountID) {
      throw new Error("Usage: npm test account getLedger <phone> <accountID>");
    }

    const response = await authRequest("/getLedger", { accountID }, jwt);
    console.log("Ledger data:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
