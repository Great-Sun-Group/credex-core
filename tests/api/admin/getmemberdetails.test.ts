import { authRequest } from "../utils/auth";

describe("Get Member Details Test", () => {
  it("getMemberDetails", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, targetMemberID] = params;
    
    if (!jwt || !targetMemberID) {
      throw new Error("Usage: npm test admin/getmemberdetails <jwt> <targetMemberID>");
    }

    console.log("\nGetting member details...");
    const response = await authRequest("/admin/getMemberDetails", {
      memberID: targetMemberID
    }, jwt);
    console.log("Member details:", response.data);
    expect(response.status).toBe(200);
  });
});
