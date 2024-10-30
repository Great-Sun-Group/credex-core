import axios from "../../setup";
import type { AxiosError } from "axios";

// Helper function to add delay between requests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Delay between requests
const DELAY_MS = 1000;

// Helper function for authenticated requests
const authRequest = async (endpoint: string, data: any, token?: string) => {
  const config = token
    ? {
        headers: { Authorization: `Bearer ${token}` },
      }
    : {};
  return axios.post(endpoint, data, config);
};

describe("Basic Integration Tests", () => {
  // Store member data for tests
  let member1 = {
    jwt: "",
    memberID: "",
    accountIDs: [] as string[],
  };
  let member2 = {
    jwt: "",
    memberID: "",
    accountIDs: [] as string[],
  };
  let member3 = {
    jwt: "",
    memberID: "",
    accountIDs: [] as string[],
  };

  // Store Bennita's data (owner of vimbisopay_trust)
  let bennitaData = {
    memberID: "",
    accountID: "",
  };

  // Store credex IDs for tests
  let credexIDs = {
    secured11USD: "",
    unsecured10USD: "",
    failed001USD: "",
    unsecured5USD: "",
    unsecured2USD: "",
    unsecured1USD: "",
    unsecured7USD: "",
    failed001USDBalance: "",
    unsecured6USD: "",
  };

  beforeAll(async () => {
    try {
      // Clear dev DBs
      console.log("Clearing dev DBs...");
      const clearResponse = await authRequest("/devadmin/clearDevDBs", {});
      console.log("Clear DBs response:", clearResponse.data);
      await delay(DELAY_MS);

      // Force DCO
      console.log("Forcing DCO...");
      const dcoResponse = await authRequest("/devadmin/forceDCO", {});
      console.log("Force DCO response:", dcoResponse.data);
      await delay(DELAY_MS);

      // Get Bennita's data
      console.log("Getting Bennita's data...");
      const bennitaResponse = await authRequest("/getMemberByHandle", {
        memberHandle: "263788435091",
      });
      console.log("Bennita response:", bennitaResponse.data);
      bennitaData.memberID = bennitaResponse.data.memberData.memberID;
      await delay(DELAY_MS);

      // Get vimbisopay_trust account data
      console.log("Getting vimbisopay_trust account data...");
      const accountResponse = await authRequest("/getAccountByHandle", {
        accountHandle: "vimbisopay_trust",
      });
      console.log("Account response:", accountResponse.data);
      bennitaData.accountID = accountResponse.data.accountData.accountID;
      await delay(DELAY_MS);

      // Create member 1
      console.log("Creating member 1...");
      const member1Response = await authRequest("/onboardMember", {
        firstname: "Test",
        lastname: "Member1",
        phone: "1234567890",
        defaultDenom: "USD",
      });
      console.log("Member 1 response:", member1Response.data);
      member1.jwt = member1Response.data.token;
      member1.memberID = member1Response.data.memberDashboard.memberID;
      member1.accountIDs = member1Response.data.memberDashboard.accountIDS;
      await delay(DELAY_MS);

      // Create member 2
      console.log("Creating member 2...");
      const member2Response = await authRequest("/onboardMember", {
        firstname: "Test",
        lastname: "Member2",
        phone: "2345678901",
        defaultDenom: "USD",
      });
      console.log("Member 2 response:", member2Response.data);
      member2.jwt = member2Response.data.token;
      member2.memberID = member2Response.data.memberDashboard.memberID;
      member2.accountIDs = member2Response.data.memberDashboard.accountIDS;
      await delay(DELAY_MS);

      // Create member 3
      console.log("Creating member 3...");
      const member3Response = await authRequest("/onboardMember", {
        firstname: "Test",
        lastname: "Member3",
        phone: "3456789012",
        defaultDenom: "USD",
      });
      console.log("Member 3 response:", member3Response.data);
      member3.jwt = member3Response.data.token;
      member3.memberID = member3Response.data.memberDashboard.memberID;
      member3.accountIDs = member3Response.data.memberDashboard.accountIDS;
      await delay(DELAY_MS);
    } catch (err) {
      console.error("Error in beforeAll:", err);
      throw err;
    }
  });

  test("Login member 1", async () => {
    const loginResponse = await authRequest("/login", {
      phone: "1234567890",
    });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.data.token).toBeTruthy();
    member1.jwt = loginResponse.data.token;
    await delay(DELAY_MS);
  });

  test("Get member by handle and account by handle", async () => {
    // Get member by handle
    const memberResponse = await authRequest("/getMemberByHandle", {
      memberHandle: "263788435091",
    });
    expect(memberResponse.status).toBe(200);
    expect(memberResponse.data).toBeTruthy();
    expect(memberResponse.data.memberData.memberID).toBe(bennitaData.memberID);
    await delay(DELAY_MS);

    // Get account by handle
    const accountResponse = await authRequest("/getAccountByHandle", {
      accountHandle: "vimbisopay_trust",
    });
    expect(accountResponse.status).toBe(200);
    expect(accountResponse.data).toBeTruthy();
    expect(accountResponse.data.accountData.accountID).toBe(
      bennitaData.accountID
    );
    await delay(DELAY_MS);
  });

  test("Create and accept secured credex", async () => {
    // Create secured credex from vimbisopay_trust to member1
    console.log("Creating secured credex...");
    const createResponse = await authRequest("/createCredex", {
      memberID: bennitaData.memberID,
      issuerAccountID: bennitaData.accountID,
      receiverAccountID: member1.accountIDs[0],
      Denomination: "USD",
      InitialAmount: 11,
      credexType: "PURCHASE",
      OFFERSorREQUESTS: "OFFERS",
      securedCredex: true,
    });
    expect(createResponse.status).toBe(200);
    console.log("Create credex response:", createResponse.data);
    credexIDs.secured11USD =
      createResponse.data.createCredexData.credex.credexID;
    await delay(DELAY_MS);

    // Member1 accepts the credex
    console.log("Accepting secured credex...");
    const acceptResponse = await authRequest(
      "/acceptCredex",
      {
        credexID: credexIDs.secured11USD,
        signerID: member1.memberID,
      },
      member1.jwt
    );
    console.log("Accept credex response:", acceptResponse.data);
    expect(acceptResponse.status).toBe(200);
    await delay(DELAY_MS);
  });

  test("Create and accept $10 credex, fail $0.01 credex (daily limit)", async () => {
    // Member1 creates $10 credex to member2
    console.log("Creating $10 credex...");
    const create10Response = await authRequest(
      "/createCredex",
      {
        memberID: member1.memberID,
        issuerAccountID: member1.accountIDs[0],
        receiverAccountID: member2.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 10,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      member1.jwt
    );
    expect(create10Response.status).toBe(200);
    console.log("Create $10 credex response:", create10Response.data);
    credexIDs.unsecured10USD =
      create10Response.data.createCredexData.credex.credexID;
    await delay(DELAY_MS);

    // Member2 accepts the credex
    console.log("Accepting $10 credex...");
    const accept10Response = await authRequest(
      "/acceptCredex",
      {
        credexID: credexIDs.unsecured10USD,
        signerID: member2.memberID,
      },
      member2.jwt
    );
    console.log("Accept $10 credex response:", accept10Response.data);
    expect(accept10Response.status).toBe(200);
    await delay(DELAY_MS);

    // Member1 attempts to create $0.01 credex (should fail due to daily limit)
    try {
      await authRequest(
        "/createCredex",
        {
          memberID: member1.memberID,
          issuerAccountID: member1.accountIDs[0],
          receiverAccountID: member2.accountIDs[0],
          Denomination: "USD",
          InitialAmount: 0.01,
          credexType: "PURCHASE",
          OFFERSorREQUESTS: "OFFERS",
          securedCredex: true,
        },
        member1.jwt
      );
      fail("Should have thrown error due to daily limit");
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
    await delay(DELAY_MS);
  });

  test("Create multiple credex and test cancel", async () => {
    // Member2 creates $5 credex to member3
    console.log("Creating $5 credex...");
    const create5Response = await authRequest(
      "/createCredex",
      {
        memberID: member2.memberID,
        issuerAccountID: member2.accountIDs[0],
        receiverAccountID: member3.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 5,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      member2.jwt
    );
    expect(create5Response.status).toBe(200);
    console.log("Create $5 credex response:", create5Response.data);
    credexIDs.unsecured5USD =
      create5Response.data.createCredexData.credex.credexID;
    await delay(DELAY_MS);

    // Member2 creates $2 credex to member3
    console.log("Creating $2 credex...");
    const create2Response = await authRequest(
      "/createCredex",
      {
        memberID: member2.memberID,
        issuerAccountID: member2.accountIDs[0],
        receiverAccountID: member3.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 2,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      member2.jwt
    );
    expect(create2Response.status).toBe(200);
    console.log("Create $2 credex response:", create2Response.data);
    credexIDs.unsecured2USD =
      create2Response.data.createCredexData.credex.credexID;
    await delay(DELAY_MS);

    // Member2 creates $1 credex to member3
    console.log("Creating $1 credex...");
    const create1Response = await authRequest(
      "/createCredex",
      {
        memberID: member2.memberID,
        issuerAccountID: member2.accountIDs[0],
        receiverAccountID: member3.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 1,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      member2.jwt
    );
    expect(create1Response.status).toBe(200);
    console.log("Create $1 credex response:", create1Response.data);
    credexIDs.unsecured1USD =
      create1Response.data.createCredexData.credex.credexID;
    await delay(DELAY_MS);

    // Member3 accepts credexes in bulk
    console.log("Accepting credexes in bulk...");
    const acceptBulkResponse = await authRequest(
      "/acceptCredexBulk",
      {
        credexIDs: [credexIDs.unsecured5USD, credexIDs.unsecured2USD],
        signerID: member3.memberID,
      },
      member3.jwt
    );
    console.log("Accept bulk response:", acceptBulkResponse.data);
    expect(acceptBulkResponse.status).toBe(200);
    await delay(DELAY_MS);

    // Member2 cancels the $1 credex
    console.log("Cancelling $1 credex...");
    const cancelResponse = await authRequest(
      "/cancelCredex",
      {
        credexID: credexIDs.unsecured1USD,
        signerID: member2.memberID,
      },
      member2.jwt
    );
    console.log("Cancel credex response:", cancelResponse.data);
    expect(cancelResponse.status).toBe(200);
    await delay(DELAY_MS);
  });

  test("Create credex and test balance limits", async () => {
    // Member3 creates $7 credex to member1
    console.log("Creating $7 credex...");
    const create7Response = await authRequest(
      "/createCredex",
      {
        memberID: member3.memberID,
        issuerAccountID: member3.accountIDs[0],
        receiverAccountID: member1.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 7,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      member3.jwt
    );
    expect(create7Response.status).toBe(200);
    console.log("Create $7 credex response:", create7Response.data);
    credexIDs.unsecured7USD =
      create7Response.data.createCredexData.credex.credexID;
    await delay(DELAY_MS);

    // Member1 accepts the credex
    console.log("Accepting $7 credex...");
    const accept7Response = await authRequest(
      "/acceptCredex",
      {
        credexID: credexIDs.unsecured7USD,
        signerID: member1.memberID,
      },
      member1.jwt
    );
    console.log("Accept $7 credex response:", accept7Response.data);
    expect(accept7Response.status).toBe(200);
    await delay(DELAY_MS);

    // Member3 attempts to create $0.01 credex (should fail due to balance)
    try {
      await authRequest(
        "/createCredex",
        {
          memberID: member3.memberID,
          issuerAccountID: member3.accountIDs[0],
          receiverAccountID: member1.accountIDs[0],
          Denomination: "USD",
          InitialAmount: 0.01,
          credexType: "PURCHASE",
          OFFERSorREQUESTS: "OFFERS",
          securedCredex: true,
        },
        member3.jwt
      );
      fail("Should have thrown error due to insufficient balance");
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
    await delay(DELAY_MS);
  });

  test("Test dashboard and decline credex", async () => {
    // Get member1's dashboard
    console.log("Getting member1's dashboard...");
    const dashboardResponse = await authRequest(
      "/getMemberDashboardByPhone",
      {
        phone: "1234567890",
      },
      member1.jwt
    );
    console.log("Dashboard response:", dashboardResponse.data);
    expect(dashboardResponse.status).toBe(200);
    const pendingInData =
      dashboardResponse.data.accountDashboards[0].pendingInData;
    expect(pendingInData).toBeTruthy();
    await delay(DELAY_MS);

    // Only try to find if pendingInData is an array
    let offeredCredex;
    if (Array.isArray(pendingInData)) {
      offeredCredex = pendingInData.find(
        (offer: any) => offer.credexID === credexIDs.secured11USD
      );
      expect(offeredCredex).toBeTruthy();
    }

    // Member1 declines the credex
    console.log("Declining credex...");
    const declineResponse = await authRequest(
      "/declineCredex",
      {
        credexID: credexIDs.secured11USD,
        signerID: member1.memberID,
      },
      member1.jwt
    );
    console.log("Decline credex response:", declineResponse.data);
    expect(declineResponse.status).toBe(200);
    await delay(DELAY_MS);
  });

  test("Create credex after decline and test ledger", async () => {
    // Member3 creates $6 credex to member1
    console.log("Creating $6 credex...");
    const create6Response = await authRequest(
      "/createCredex",
      {
        memberID: member3.memberID,
        issuerAccountID: member3.accountIDs[0],
        receiverAccountID: member1.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 6,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      member3.jwt
    );
    expect(create6Response.status).toBe(200);
    console.log("Create $6 credex response:", create6Response.data);
    credexIDs.unsecured6USD =
      create6Response.data.createCredexData.credex.credexID;
    await delay(DELAY_MS);

    // Member1 gets credex details
    console.log("Getting credex details...");
    const getCredexResponse = await authRequest(
      "/getCredex",
      {
        credexID: credexIDs.unsecured6USD,
      },
      member1.jwt
    );
    console.log("Get credex response:", getCredexResponse.data);
    expect(getCredexResponse.status).toBe(200);
    expect(getCredexResponse.data.credexID).toBe(credexIDs.unsecured6USD);
    await delay(DELAY_MS);

    // Get member1's ledger
    console.log("Getting member1's ledger...");
    const ledgerResponse = await authRequest(
      "/getLedger",
      {
        accountID: member1.accountIDs[0],
      },
      member1.jwt
    );
    console.log("Ledger response:", ledgerResponse.data);
    expect(ledgerResponse.status).toBe(200);
    expect(ledgerResponse.data).toBeTruthy();
  });
});
