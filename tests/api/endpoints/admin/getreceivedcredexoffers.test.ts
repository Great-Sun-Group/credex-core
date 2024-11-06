import { authRequest } from "../../utils/request";
import { loginMember } from "../../utils/auth";
import { delay, DELAY_MS } from "../../utils/delay";

const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);

describe("Get Received Credex Offers Test", () => {
  let jwt = "";
  let memberID = "";

  beforeAll(async () => {
    const [phone] = params;
    if (!phone) {
      throw new Error("Usage: npm test admin/getReceivedCredexOffers <phone> <accountID>");
    }
    const auth = await loginMember(phone);
    jwt = auth.jwt;
    memberID = auth.memberID;
  });

  it("getReceivedCredexOffers", async () => {
    const [, accountID] = params;
    if (!accountID) {
      throw new Error("Usage: npm test admin/getReceivedCredexOffers <phone> <accountID>");
    }

    console.log("\nGetting received Credex offers...");
    const response = await authRequest("/admin/getReceivedCredexOffers", {
      accountID
    }, jwt);
    console.log("Received offers:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
