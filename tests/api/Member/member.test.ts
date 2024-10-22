import axios from "../../setup";

describe("Member API Tests", () => {
  let testMemberID: string;
  let testMemberPhone: string;
  let testMemberJWT: string;
  let testAccountID: string;

  describe("Member Endpoints", () => {
    it("should onboard a new member successfully", async () => {
      const phoneNumber = `1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
      const memberData = {
        firstname: "TestMember",
        lastname: "ForAPITests",
        phone: phoneNumber,
        defaultDenom: "USD",
      };

      const response = await axios.post("/v1/onboardMember", memberData);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("token");
      expect(response.data).toHaveProperty("memberDashboard");
      expect(response.data.memberDashboard).toHaveProperty("memberID");
      expect(response.data.memberDashboard).toHaveProperty("accountIDS");
      expect(response.data.memberDashboard.accountIDS.length).toBeGreaterThan(
        0
      );

      testMemberJWT = response.data.token;
      testMemberPhone = phoneNumber;
      testMemberID = response.data.memberDashboard.memberID;
      testAccountID = response.data.memberDashboard.accountIDS[0];

      console.log("Onboarded member phone:", testMemberPhone);
      console.log("Test Account ID:", testAccountID);
    });

    it("should login a member", async () => {
      const loginData = { phone: testMemberPhone };

      const response = await axios.post("/v1/login", loginData);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("token");
    });

    it("should get member by handle", async () => {
      console.log("Getting member by handle:", testMemberPhone);
      const data = { memberHandle: testMemberPhone };

      const response = await axios.post("/v1/getMemberByHandle", data, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.memberData).toHaveProperty("memberID");
    });

    it("should get member dashboard by phone", async () => {
      const data = { phone: testMemberPhone };

      const response = await axios.post("/v1/getMemberDashboardByPhone", data, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.memberDashboard).toHaveProperty("memberID");
      expect(response.data.memberDashboard).toHaveProperty("accountIDS");
      expect(response.data.memberDashboard.accountIDS).toContain(testAccountID);
    });

    it("should authenticate for tier spend limit", async () => {
      const data = {
        issuerAccountID: testAccountID,
        Amount: 5, // Under the $10 USD per day limit for new Open tier accounts
        Denomination: "USD",
        securedCredex: true,
      };

      const response = await axios.post("/v1/authForTierSpendLimit", data, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("isAuthorized");
      expect(response.data.isAuthorized).toBe(true);
    });

    it("should set DCO participant rate", async () => {
      const data = {
        memberID: testMemberID,
        personalAccountID: testAccountID,
        DCOgiveInCXX: 0.5,
        DCOdenom: "USD",
      };

      const response = await axios.post("/v1/setDCOparticipantRate", data, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("message");
    });
  });
});
