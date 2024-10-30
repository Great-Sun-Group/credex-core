import axios from "../../setup";

describe("Credex API Tests", () => {
  let firstMemberID: string;
  let firstMemberJWT: string;
  let firstAccountID: string;
  let secondMemberID: string;
  let secondMemberJWT: string;
  let secondAccountID: string;
  let bennitaJWT: string;
  let bennitaMemberID: string;
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

      const firstResponse = await axios.post(
        "/onboardMember",
        firstMemberData
      );

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

      const secondResponse = await axios.post(
        "/onboardMember",
        secondMemberData
      );

      expect(secondResponse.status).toBe(201);
      expect(secondResponse.data).toHaveProperty("token");
      expect(secondResponse.data).toHaveProperty("memberDashboard");
      expect(secondResponse.data.memberDashboard).toHaveProperty("memberID");
      expect(secondResponse.data.memberDashboard).toHaveProperty("accountIDS");
      expect(secondResponse.data.memberDashboard.accountIDS.length).toBe(1);

      secondMemberJWT = secondResponse.data.token;
      secondMemberID = secondResponse.data.memberDashboard.memberID;
      secondAccountID = secondResponse.data.memberDashboard.accountIDS[0];

      // Login as Bennita Murranda to get auth for vimbisopay_trust
      const bennitaLoginResponse = await axios.post("/login", {
        phone: "263788435091",
      });
      expect(bennitaLoginResponse.status).toBe(200);
      expect(bennitaLoginResponse.data).toHaveProperty("token");
      bennitaJWT = bennitaLoginResponse.data.token;

      const bennitaDashboardResponse = await axios.post(
        "/getMemberDashboardByPhone",
        {
          phone: "263788435091",
        },
        {
          headers: { Authorization: `Bearer ${bennitaJWT}` },
        }
      );
      expect(bennitaDashboardResponse.status).toBe(200);
      expect(bennitaDashboardResponse.data.memberDashboard).toHaveProperty(
        "memberID"
      );
      bennitaMemberID = bennitaDashboardResponse.data.memberDashboard.memberID;

      // Get vimbisopay_trust account ID
      const vimbisopayResponse = await axios.post(
        "/getAccountByHandle",
        { accountHandle: "vimbisopay_trust" },
        {
          headers: { Authorization: `Bearer ${bennitaJWT}` },
        }
      );
      expect(vimbisopayResponse.status).toBe(200);
      expect(vimbisopayResponse.data).toHaveProperty("accountData");
      expect(vimbisopayResponse.data.accountData).toHaveProperty("accountID");
      vimbisopayAccountID = vimbisopayResponse.data.accountData.accountID;

      console.log("Test data setup completed");
      console.log("First Member ID:", firstMemberID);
      console.log("First Account ID:", firstAccountID);
      console.log("Second Member ID:", secondMemberID);
      console.log("Second Account ID:", secondAccountID);
      console.log("Vimbisopay Account ID:", vimbisopayAccountID);
      console.log("Bennita's Member ID:", bennitaMemberID);
    });

    it("should create a loop of three secured credexes successfully", async () => {
      // First credex: vimbisopay_trust to first member
      const credexData1 = {
        memberID: bennitaMemberID,
        issuerAccountID: vimbisopayAccountID,
        receiverAccountID: firstAccountID,
        Denomination: "USD",
        InitialAmount: 1,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      };

      const response1 = await axios.post("/createCredex", credexData1, {
        headers: { Authorization: `Bearer ${bennitaJWT}` },
      });

      console.log(
        "First credex response:",
        JSON.stringify(response1.data, null, 2)
      );

      expect(response1.status).toBe(200);
      expect(response1.data.createCredexData.credex).toHaveProperty("credexID");
      expect(response1.data.createCredexData.credex).toHaveProperty(
        "formattedInitialAmount",
        "1.00"
      );
      expect(response1.data.createCredexData.credex).toHaveProperty(
        "secured",
        true
      );

      // Accept first credex
      const acceptData1 = {
        credexID: response1.data.createCredexData.credex.credexID,
        signerID: firstMemberID,
      };

      const acceptResponse1 = await axios.post(
        "/acceptCredex",
        acceptData1,
        {
          headers: { Authorization: `Bearer ${firstMemberJWT}` },
        }
      );

      expect(acceptResponse1.status).toBe(200);
      expect(acceptResponse1.data).toHaveProperty("status", "ACCEPTED");

      // Second credex: first member to second member
      const credexData2 = {
        memberID: firstMemberID,
        issuerAccountID: firstAccountID,
        receiverAccountID: secondAccountID,
        Denomination: "USD",
        InitialAmount: 1,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      };

      const response2 = await axios.post("/createCredex", credexData2, {
        headers: { Authorization: `Bearer ${firstMemberJWT}` },
      });

      expect(response2.status).toBe(200);
      expect(response2.data.createCredexData.credex).toHaveProperty("credexID");
      expect(response2.data.createCredexData.credex).toHaveProperty(
        "formattedInitialAmount",
        "1.00"
      );
      expect(response2.data.createCredexData.credex).toHaveProperty(
        "secured",
        true
      );

      // Accept second credex
      const acceptData2 = {
        credexID: response2.data.createCredexData.credex.credexID,
        signerID: secondMemberID,
      };

      const acceptResponse2 = await axios.post(
        "/acceptCredex",
        acceptData2,
        {
          headers: { Authorization: `Bearer ${secondMemberJWT}` },
        }
      );

      expect(acceptResponse2.status).toBe(200);
      expect(acceptResponse2.data).toHaveProperty("status", "ACCEPTED");

      // Third credex: second member back to vimbisopay_trust
      const credexData3 = {
        memberID: secondMemberID,
        issuerAccountID: secondAccountID,
        receiverAccountID: vimbisopayAccountID,
        Denomination: "USD",
        InitialAmount: 1,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      };

      const response3 = await axios.post("/createCredex", credexData3, {
        headers: { Authorization: `Bearer ${secondMemberJWT}` },
      });

      expect(response3.status).toBe(200);
      expect(response3.data.createCredexData.credex).toHaveProperty("credexID");
      expect(response3.data.createCredexData.credex).toHaveProperty(
        "formattedInitialAmount",
        "1.00"
      );
      expect(response3.data.createCredexData.credex).toHaveProperty(
        "secured",
        true
      );

      // Accept third credex
      const acceptData3 = {
        credexID: response3.data.createCredexData.credex.credexID,
        signerID: bennitaMemberID,
      };

      const acceptResponse3 = await axios.post(
        "/acceptCredex",
        acceptData3,
        {
          headers: { Authorization: `Bearer ${bennitaJWT}` },
        }
      );

      expect(acceptResponse3.status).toBe(200);
      expect(acceptResponse3.data).toHaveProperty("status", "ACCEPTED");
    });

    it("should fail to create a secured credex exceeding the daily limit", async () => {
      const credexData = {
        memberID: firstMemberID,
        issuerAccountID: firstAccountID,
        receiverAccountID: secondAccountID,
        Denomination: "USD",
        InitialAmount: 10, // has already created a $1 credex
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      };

      try {
        await axios.post("/createCredex", credexData, {
          headers: { Authorization: `Bearer ${firstMemberJWT}` },
        });
        fail("Expected an error to be thrown");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty("error");
        expect(error.response.data.error).toContain(
          "cannot be issued because your maximum securable USD balance is"
        );
      }
    });

    it("should fail to create a credex with invalid input", async () => {
      const invalidCredexData = {
        memberID: "invalid-uuid",
        issuerAccountID: firstAccountID,
        receiverAccountID: secondAccountID,
        Denomination: "INVALID",
        InitialAmount: "not-a-number",
        credexType: "INVALID_TYPE",
        OFFERSorREQUESTS: "INVALID",
        securedCredex: "not-a-boolean",
      };

      try {
        await axios.post("/createCredex", invalidCredexData, {
          headers: { Authorization: `Bearer ${firstMemberJWT}` },
        });
        fail("Expected an error to be thrown");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty("message");
        expect(error.response.data.message).toContain("Invalid UUID format");
      }
    });

    it("should accept multiple credexes in bulk", async () => {
      // Create two credexes to accept
      const credexData1 = {
        memberID: firstMemberID,
        issuerAccountID: firstAccountID,
        receiverAccountID: secondAccountID,
        Denomination: "USD",
        InitialAmount: 0.5,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      };

      const credexData2 = {
        memberID: firstMemberID,
        issuerAccountID: firstAccountID,
        receiverAccountID: secondAccountID,
        Denomination: "USD",
        InitialAmount: 0.6,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      };

      const response1 = await axios.post("/createCredex", credexData1, {
        headers: { Authorization: `Bearer ${firstMemberJWT}` },
      });

      const response2 = await axios.post("/createCredex", credexData2, {
        headers: { Authorization: `Bearer ${firstMemberJWT}` },
      });

      const credexID1 = response1.data.createCredexData.credex.credexID;
      const credexID2 = response2.data.createCredexData.credex.credexID;

      // Accept both credexes in bulk
      const bulkAcceptData = {
        credexIDs: [credexID1, credexID2],
        signerID: secondMemberID,
      };

      const bulkAcceptResponse = await axios.post(
        "/acceptCredexBulk",
        bulkAcceptData,
        {
          headers: { Authorization: `Bearer ${secondMemberJWT}` },
        }
      );

      expect(bulkAcceptResponse.status).toBe(200);
      expect(bulkAcceptResponse.data).toHaveProperty("acceptedCredexes");
      expect(bulkAcceptResponse.data.acceptedCredexes).toHaveLength(2);
      expect(bulkAcceptResponse.data.acceptedCredexes[0]).toHaveProperty(
        "status",
        "ACCEPTED"
      );
      expect(bulkAcceptResponse.data.acceptedCredexes[1]).toHaveProperty(
        "status",
        "ACCEPTED"
      );
    });

    // Additional tests...
  });
});
