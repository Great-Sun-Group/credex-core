import { authRequest } from "../utils/auth";

describe("Get Account Details Test", () => {
  it("getAccountDetails", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, accountID] = params;
    
    if (!jwt || !accountID) {
      throw new Error("Usage: npm test admin/getaccountdetails <jwt> <accountID>");
    }

    console.log("\nGetting account details...");
    const response = await authRequest("/admin/getAccountDetails", {
      accountID
    }, jwt);
    console.log("Account details:", response.data);
    expect(response.status).toBe(200);
  });
});
