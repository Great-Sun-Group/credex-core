import { authRequest } from "../../utils/request";
import { delay, DELAY_MS } from "../../utils/delay";

describe("Update Member Tier Test", () => {
  it("updateMemberTier", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, memberID, targetMemberID, tier] = params;
    
    if (!jwt || !memberID || !targetMemberID || !tier) {
      throw new Error("Usage: npm test admin/updatemembertier <jwt> <memberID> <targetMemberID> <tier>");
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
