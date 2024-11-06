import { authRequest } from "../../utils/request";
import { loginMember } from "../../utils/auth";
import { delay, DELAY_MS } from "../../utils/delay";

const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);

describe("Update Member Tier Test", () => {
  let jwt = "";
  let memberID = "";

  beforeAll(async () => {
    const [phone] = params;
    if (!phone) {
      throw new Error("Usage: npm test admin/updateMemberTier <phone> <memberID> <tier>");
    }
    const auth = await loginMember(phone);
    jwt = auth.jwt;
    memberID = auth.memberID;
  });

  it("updateMemberTier", async () => {
    const [, targetMemberID, tier] = params;
    if (!targetMemberID || !tier) {
      throw new Error("Usage: npm test admin/updateMemberTier <phone> <memberID> <tier>");
    }

    console.log("\nUpdating member tier...");
    const response = await authRequest("/admin/updateMemberTier", {
      memberID: targetMemberID,
      tier: Number(tier)
    }, jwt);
    console.log("Update tier response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
