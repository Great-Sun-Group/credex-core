import { getMemberDetails, getAccountDetails, updateMemberTier, 
         getReceivedCredexOffers, getSentCredexOffers } from "../../utils/endpoints/admin";
import { onboardMember } from "../../utils/endpoints/member";
import { delay, DELAY_MS } from "../../utils/delay";

describe("Admin API Tests", () => {
  let testAccountID: string;
  let testAccountHandle: string;
  let testMemberID: string;
  let testMemberJWT: string;

  beforeAll(async () => {
    // Onboard a test member
    const phoneNumber = `1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    const memberResponse = await onboardMember("TestMember", "ForAdminTests", phoneNumber, "USD");
    
    testMemberID = memberResponse.data.memberDashboard.memberID;
    testMemberJWT = memberResponse.data.token;
    testAccountID = memberResponse.data.memberDashboard.accountIDS[0];
    testAccountHandle = phoneNumber;
    
    console.log("Test member created:", testMemberID);
  });

  beforeEach(async () => {
    await delay(DELAY_MS);
  });

  describe("Admin Dashboard Endpoints", () => {
    it("should get member details", async () => {
      const response = await getMemberDetails(testMemberID, testMemberJWT);
      expect(response.data.data[0]).toHaveProperty("memberID", testMemberID);
    });

    it("should get account details", async () => {
      const response = await getAccountDetails(testAccountID, testMemberJWT);
      expect(response.data.data[0]).toHaveProperty("accountID", testAccountID);
    });

    it("should update member tier", async () => {
      const response = await updateMemberTier(testMemberID, 3, testMemberJWT);
      expect(response.data.message).toContain("Member tier updated successfully");
    });

    it("should get received Credex offers", async () => {
      const response = await getReceivedCredexOffers(testAccountID, testMemberJWT);
      if (response.data.message === "Account received credex offers not found") {
        expect(response.data).toHaveProperty("message");
      } else {
        expect(response.data).toHaveProperty("receivedOffers");
        expect(Array.isArray(response.data.receivedOffers)).toBe(true);
      }
    });

    it("should get sent Credex offers", async () => {
      const response = await getSentCredexOffers(testAccountID, testMemberJWT);
      if (response.data.message === "Account sent credex offers not found") {
        expect(response.data).toHaveProperty("message");
      } else {
        expect(response.data).toHaveProperty("sentOffers");
        expect(Array.isArray(response.data.sentOffers)).toBe(true);
      }
    });
  });
});
