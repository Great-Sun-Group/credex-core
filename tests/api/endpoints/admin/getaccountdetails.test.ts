import { authRequest } from "../../utils/request";
import { loginMember } from "../../utils/auth";
import { delay, DELAY_MS } from "../../utils/delay";

const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);

describe("Get Account Details Test", () => {
  let jwt = "";
  let memberID = "";

  beforeAll(async () => {
    const [phone] = params;
    if (!phone) {
      throw new Error("Usage: npm test admin/getAccountDetails <phone> <accountID>");
    }
    const auth = await loginMember(phone);
    jwt = auth.jwt;
    memberID = auth.memberID;
  });

  it("getAccountDetails", async () => {
    const [, accountID] = params;
    if (!accountID) {
      throw new Error("Usage: npm test admin/getAccountDetails <phone> <accountID>");
    }

    console.log("\nGetting account details...");
    const response = await authRequest("/admin/getAccountDetails", {
      accountID
    }, jwt);
    console.log("Account details:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
