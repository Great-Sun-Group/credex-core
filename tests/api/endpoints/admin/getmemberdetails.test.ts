import { authRequest } from "../../utils/request";
import { loginMember } from "../../utils/auth";
import { delay, DELAY_MS } from "../../utils/delay";

const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);

describe("Get Member Details Test", () => {
  let jwt = "";
  let memberID = "";

  beforeAll(async () => {
    const [phone] = params;
    if (!phone) {
      throw new Error("Usage: npm test admin/getMemberDetails <phone> <memberID>");
    }
    const auth = await loginMember(phone);
    jwt = auth.jwt;
    memberID = auth.memberID;
  });

  it("getMemberDetails", async () => {
    const [, targetMemberID] = params;
    if (!targetMemberID) {
      throw new Error("Usage: npm test admin/getMemberDetails <phone> <memberID>");
    }

    console.log("\nGetting member details...");
    const response = await authRequest("/admin/getMemberDetails", {
      memberID: targetMemberID
    }, jwt);
    console.log("Member details:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
