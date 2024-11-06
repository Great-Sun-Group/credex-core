import { authRequest } from "../../utils/request";
import { loginMember } from "../../utils/auth";
import { delay, DELAY_MS } from "../../utils/delay";

const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);

describe("Get Sent Credex Offers Test", () => {
  let jwt = "";
  let memberID = "";

  beforeAll(async () => {
    const [phone] = params;
    if (!phone) {
      throw new Error("Usage: npm test admin/getSentCredexOffers <phone> <accountID>");
    }
    const auth = await loginMember(phone);
    jwt = auth.jwt;
    memberID = auth.memberID;
  });

  it("getSentCredexOffers", async () => {
    const [, accountID] = params;
    if (!accountID) {
      throw new Error("Usage: npm test admin/getSentCredexOffers <phone> <accountID>");
    }

    console.log("\nGetting sent Credex offers...");
    const response = await authRequest("/admin/getSentCredexOffers", {
      accountID
    }, jwt);
    console.log("Sent offers:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
