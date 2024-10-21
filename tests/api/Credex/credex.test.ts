import axios from "../../setup";

describe("Credex API Tests", () => {
  let firstMemberID: string;
  let firstMemberJWT: string;
  let firstAccountID: string;
  let secondMemberID: string;
  let secondMemberJWT: string;
  let secondAccountID: string;
  let vimbisopayJWT: string;
  let vimbisopayAccountID: string;

  describe("Credex Endpoints", () => {
    it("should set up test data", async () => {
      // Create first member
      const firstPhoneNumber = `1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
      const firstMemberData = {
        firstname: "TestCredexFirst",
        lastname: "Member",
        phone: firstPhoneNumber,
        defaultDenom: "USD",
      };

      const firstResponse = await axios.post("/v1/onboardMember", firstMemberData);

      expect(firstResponse.status).toBe(201);
      expect(firstResponse.data).toHaveProperty("token");
      expect(firstResponse.data).toHaveProperty("memberDashboard");
      expect(firstResponse.data.memberDashboard).toHaveProperty("memberID");
      expect(firstResponse.data.memberDashboard).toHaveProperty("accountIDS");
      expect(firstResponse.data.memberDashboard.accountIDS.length).toBe(1);

      firstMemberJWT = firstResponse.data.token;
      firstMemberID = firstResponse.data.memberDashboard.memberID;
      firstAccountID = firstResponse.data.memberDashboard.accountIDS[0];

      // Create second member
      const secondPhoneNumber = `1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
      const secondMemberData = {
        firstname: "TestCredexSecond",
        lastname: "Member",
        phone: secondPhoneNumber,
        defaultDenom: "USD",
      };

      const secondResponse = await axios.post("/v1/onboardMember", secondMemberData);

      expect(secondResponse.status).toBe(201);
      expect(secondResponse.data).toHaveProperty("token");
      expect(secondResponse.data).toHaveProperty("memberDashboard");
      expect(secondResponse.data.memberDashboard).toHaveProperty("memberID");
      expect(secondResponse.data.memberDashboard).toHaveProperty("accountIDS");
      expect(secondResponse.data.memberDashboard.accountIDS.length).toBe(1);

      secondMemberJWT = secondResponse.data.token;
      secondMemberID = secondResponse.data.memberDashboard.memberID;
      secondAccountID = secondResponse.data.memberDashboard.accountIDS[0];

      // Login as vimbisopay.trust
      const vimbisopayLoginResponse = await axios.post("/v1/login", { accountHandle: "vimbisopay.trust" });
      expect(vimbisopayLoginResponse.status).toBe(200);
      expect(vimbisopayLoginResponse.data).toHaveProperty("token");
      vimbisopayJWT = vimbisopayLoginResponse.data.token;

      // Get vimbisopay.trust account ID
      const vimbisopayResponse = await axios.get("/v1/getAccountByHandle?accountHandle=vimbisopay.trust", {
        headers: { Authorization: `Bearer ${vimbisopayJWT}` },
      });
      expect(vimbisopayResponse.status).toBe(200);
      expect(vimbisopayResponse.data).toHaveProperty("accountID");
      vimbisopayAccountID = vimbisopayResponse.data.accountID;

      console.log("Test data setup completed");
      console.log("First Member ID:", firstMemberID);
      console.log("First Account ID:", firstAccountID);
      console.log("Second Member ID:", secondMemberID);
      console.log("Second Account ID:", secondAccountID);
      console.log("Vimbisopay Account ID:", vimbisopayAccountID);
    });

    it("should create a loop of three secured credexes successfully", async () => {
      // First credex: vimbisopay.trust to first member
      const credexData1 = {
        offerorAccountID: vimbisopayAccountID,
        receiverAccountID: firstAccountID,
        amount: 10,
        denomination: "USD",
        credexType: "FLOATING",
        credspan: 30,
      };

      const response1 = await axios.post("/v1/offerSecuredCredex", credexData1, {
        headers: { Authorization: `Bearer ${vimbisopayJWT}` },
      });

      expect(response1.status).toBe(200);
      expect(response1.data).toHaveProperty("credexID");
      expect(response1.data).toHaveProperty("status", "OFFERED");

      // Accept first credex
      const acceptData1 = {
        credexID: response1.data.credexID,
        signerID: firstMemberID,
      };

      const acceptResponse1 = await axios.put("/v1/acceptCredex", acceptData1, {
        headers: { Authorization: `Bearer ${firstMemberJWT}` },
      });

      expect(acceptResponse1.status).toBe(200);
      expect(acceptResponse1.data).toHaveProperty("status", "ACCEPTED");

      // Second credex: first member to second member
      const credexData2 = {
        offerorAccountID: firstAccountID,
        receiverAccountID: secondAccountID,
        amount: 10,
        denomination: "USD",
        credexType: "FLOATING",
        credspan: 30,
      };

      const response2 = await axios.post("/v1/offerSecuredCredex", credexData2, {
        headers: { Authorization: `Bearer ${firstMemberJWT}` },
      });

      expect(response2.status).toBe(200);
      expect(response2.data).toHaveProperty("credexID");
      expect(response2.data).toHaveProperty("status", "OFFERED");

      // Accept second credex
      const acceptData2 = {
        credexID: response2.data.credexID,
        signerID: secondMemberID,
      };

      const acceptResponse2 = await axios.put("/v1/acceptCredex", acceptData2, {
        headers: { Authorization: `Bearer ${secondMemberJWT}` },
      });

      expect(acceptResponse2.status).toBe(200);
      expect(acceptResponse2.data).toHaveProperty("status", "ACCEPTED");

      // Third credex: second member back to vimbisopay.trust
      const credexData3 = {
        offerorAccountID: secondAccountID,
        receiverAccountID: vimbisopayAccountID,
        amount: 10,
        denomination: "USD",
        credexType: "FLOATING",
        credspan: 30,
      };

      const response3 = await axios.post("/v1/offerSecuredCredex", credexData3, {
        headers: { Authorization: `Bearer ${secondMemberJWT}` },
      });

      expect(response3.status).toBe(200);
      expect(response3.data).toHaveProperty("credexID");
      expect(response3.data).toHaveProperty("status", "OFFERED");

      // Accept third credex
      const acceptData3 = {
        credexID: response3.data.credexID,
        signerID: vimbisopayAccountID,
      };

      const acceptResponse3 = await axios.put("/v1/acceptCredex", acceptData3, {
        headers: { Authorization: `Bearer ${vimbisopayJWT}` },
      });

      expect(acceptResponse3.status).toBe(200);
      expect(acceptResponse3.data).toHaveProperty("status", "ACCEPTED");
    });

    it("should fail to create a secured credex exceeding the daily limit", async () => {
      const credexData = {
        offerorAccountID: firstAccountID,
        receiverAccountID: secondAccountID,
        amount: 10.01,
        denomination: "USD",
        credexType: "FLOATING",
        credspan: 30,
      };

      try {
        await axios.post("/v1/offerSecuredCredex", credexData, {
          headers: { Authorization: `Bearer ${firstMemberJWT}` },
        });
        fail("Expected an error to be thrown");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty("error");
        expect(error.response.data.error).toContain("Exceeds daily limit");
      }
    });

    // Additional tests...

  });
});
