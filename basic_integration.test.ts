import type { AxiosError } from "axios";
import { authRequest } from "./tests/api/utils/request";
import { delay, DELAY_MS } from "./tests/api/utils/delay";
import axios from "./tests/setup";

// Increase global test timeout
jest.setTimeout(120000);

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
      // Get Bennita's data
      const bennitaResponse = await authRequest(
        "/getMemberByHandle",
        {
          memberHandle: "263788435091",
        },
        ""
      );
      bennitaData.memberID = bennitaResponse.data.memberData.memberID;

      // Get vimbisopay_trust account data
      const accountResponse = await authRequest(
        "/getAccountByHandle",
        {
          accountHandle: "vimbisopay_trust",
        },
        ""
      );
      bennitaData.accountID = accountResponse.data.accountData.accountID;

      // Create test members
      const member1Response = await axios.post(
        "/onboardMember",
        {
          firstname: "Test",
          lastname: "Member1",
          phone: "1234567890",
          defaultDenom: "USD",
        },
        {
          headers: {
            "x-client-api-key": process.env.CLIENT_API_KEY,
          },
        }
      );
      member1.jwt = member1Response.data.token;
      member1.memberID = member1Response.data.memberDashboard.memberID;
      member1.accountIDs = member1Response.data.memberDashboard.accountIDS;
      await delay(DELAY_MS);

      const member2Response = await axios.post(
        "/onboardMember",
        {
          firstname: "Test",
          lastname: "Member2",
          phone: "2345678901",
          defaultDenom: "USD",
        },
        {
          headers: {
            "x-client-api-key": process.env.CLIENT_API_KEY,
          },
        }
      );
      member2.jwt = member2Response.data.token;
      member2.memberID = member2Response.data.memberDashboard.memberID;
      member2.accountIDs = member2Response.data.memberDashboard.accountIDS;
      await delay(DELAY_MS);

      const member3Response = await axios.post(
        "/onboardMember",
        {
          firstname: "Test",
          lastname: "Member3",
          phone: "3456789012",
          defaultDenom: "USD",
        },
        {
          headers: {
            "x-client-api-key": process.env.CLIENT_API_KEY,
          },
        }
      );
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
    const loginResponse = await axios.post(
      "/login",
      {
        phone: "1234567890",
      },
      {
        headers: {
          "x-client-api-key": process.env.CLIENT_API_KEY || "",
        },
      }
    );
    expect(loginResponse.status).toBe(200);
    member1.jwt = loginResponse.data.token;
    await delay(DELAY_MS);
  });

  test("Get member by handle and account by handle", async () => {
    // Get member by handle
    const memberResponse = await authRequest(
      "/getMemberByHandle",
      {
        memberHandle: "263788435091",
      },
      ""
    );
    expect(memberResponse.data.memberData.memberID).toBe(bennitaData.memberID);
    await delay(DELAY_MS);

    // Get account by handle
    const accountResponse = await authRequest(
      "/getAccountByHandle",
      {
        accountHandle: "vimbisopay_trust",
      },
      ""
    );
    expect(accountResponse.data.accountData.accountID).toBe(
      bennitaData.accountID
    );
    await delay(DELAY_MS);
  });

  test("Create and accept secured credex", async () => {
    // Create secured credex from vimbisopay_trust to member1
    const createResponse = await authRequest(
      "/createCredex",
      {
        issuerAccountID: bennitaData.accountID,
        receiverAccountID: member1.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 11,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      ""
    );
    credexIDs.secured11USD =
      createResponse.data.createCredexData.credex.credexID;

    // Member1 accepts the credex
    await authRequest(
      "/acceptCredex",
      {
        credexID: credexIDs.secured11USD,
      },
      member1.jwt
    );
    await delay(DELAY_MS);
  });

  test("Create and accept $10 credex, fail $0.01 credex (daily limit)", async () => {
    // Member1 creates $10 credex to member2
    const create10Response = await authRequest(
      "/createCredex",
      {
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
    credexIDs.unsecured10USD =
      create10Response.data.createCredexData.credex.credexID;

    // Member2 accepts the credex
    await authRequest(
      "/acceptCredex",
      {
        credexID: credexIDs.unsecured10USD,
      },
      member2.jwt
    );
    await delay(DELAY_MS);

    // Member1 attempts to create $0.01 credex (should fail due to daily limit)
    try {
      await authRequest(
        "/createCredex",
        {
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
    const create5Response = await authRequest(
      "/createCredex",
      {
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
    credexIDs.unsecured5USD =
      create5Response.data.createCredexData.credex.credexID;

    // Member2 creates $2 credex to member3
    const create2Response = await authRequest(
      "/createCredex",
      {
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
    credexIDs.unsecured2USD =
      create2Response.data.createCredexData.credex.credexID;

    // Member2 creates $1 credex to member3
    const create1Response = await authRequest(
      "/createCredex",
      {
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
    credexIDs.unsecured1USD =
      create1Response.data.createCredexData.credex.credexID;

    // Member3 accepts credexes in bulk
    await authRequest(
      "/acceptCredexBulk",
      {
        credexIDs: [credexIDs.unsecured5USD, credexIDs.unsecured2USD],
      },
      member3.jwt
    );
    await delay(DELAY_MS);

    // Member2 cancels the $1 credex
    await authRequest(
      "/cancelCredex",
      {
        credexID: credexIDs.unsecured1USD,
      },
      member2.jwt
    );
    await delay(DELAY_MS);
  });

  test("Create credex and test balance limits", async () => {
    // Member3 creates $7 credex to member1
    try {
      await authRequest(
        "/createCredex",
        {
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
      fail("Should have thrown error due to insufficient balance");
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
    await delay(DELAY_MS);
  });

  test("Test dashboard and decline credex", async () => {
    // Create a new credex to decline
    const createResponse = await authRequest(
      "/createCredex",
      {
        issuerAccountID: bennitaData.accountID,
        receiverAccountID: member1.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 11,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      ""
    );
    credexIDs.secured11USD =
      createResponse.data.createCredexData.credex.credexID;

    // Get member1's dashboard
    const dashboardResponse = await authRequest(
      "/getMemberDashboardByPhone",
      {
        phone: "1234567890",
      },
      member1.jwt
    );
    const pendingInData =
      dashboardResponse.data.accountDashboards[0].pendingInData;
    expect(pendingInData).toBeTruthy();
    await delay(DELAY_MS);

    // Member1 declines the credex
    await authRequest(
      "/declineCredex",
      {
        credexID: credexIDs.secured11USD,
      },
      member1.jwt
    );
    await delay(DELAY_MS);
  });

  test("Create credex after decline and test ledger", async () => {
    // Member3 creates $6 credex to member1
    const create6Response = await authRequest(
      "/createCredex",
      {
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
    credexIDs.unsecured6USD =
      create6Response.data.createCredexData.credex.credexID;

    // Member1 gets credex details
    const getCredexResponse = await authRequest(
      "/getCredex",
      {
        credexID: credexIDs.unsecured6USD,
        accountID: member1.accountIDs[0],
      },
      member1.jwt
    );
    expect(getCredexResponse.data.credexData.credexID).toBe(
      credexIDs.unsecured6USD
    );
    await delay(DELAY_MS);

    // Get member1's ledger
    const ledgerResponse = await authRequest(
      "/getLedger",
      {
        accountID: member1.accountIDs[0],
      },
      member1.jwt
    );
    expect(ledgerResponse.data).toBeTruthy();
    await delay(DELAY_MS);
  });
});
