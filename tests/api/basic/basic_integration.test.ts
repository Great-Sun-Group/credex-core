import type { AxiosError } from "axios";
import { clearDevDBs, forceDCO } from "../utils/endpoints/devadmin";
import { onboardMember, getMemberByHandle, getMemberDashboardByPhone } from "../utils/endpoints/member";
import { getAccountByHandle, getLedger } from "../utils/endpoints/account";
import { createCredex, acceptCredex, acceptCredexBulk, declineCredex, cancelCredex, getCredex } from "../utils/endpoints/credex";
import { loginMember } from "../utils/auth";
import { delay, DELAY_MS } from "../utils/delay";

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
      // Clear dev DBs and force DCO
      await clearDevDBs();
      await forceDCO();

      // Get Bennita's data
      const bennitaResponse = await getMemberByHandle("263788435091", "");
      bennitaData.memberID = bennitaResponse.data.memberData.memberID;

      // Get vimbisopay_trust account data
      const accountResponse = await getAccountByHandle("vimbisopay_trust", "");
      bennitaData.accountID = accountResponse.data.accountData.accountID;

      // Create test members
      const member1Response = await onboardMember("Test", "Member1", "1234567890", "USD");
      member1.jwt = member1Response.data.token;
      member1.memberID = member1Response.data.memberDashboard.memberID;
      member1.accountIDs = member1Response.data.memberDashboard.accountIDS;

      const member2Response = await onboardMember("Test", "Member2", "2345678901", "USD");
      member2.jwt = member2Response.data.token;
      member2.memberID = member2Response.data.memberDashboard.memberID;
      member2.accountIDs = member2Response.data.memberDashboard.accountIDS;

      const member3Response = await onboardMember("Test", "Member3", "3456789012", "USD");
      member3.jwt = member3Response.data.token;
      member3.memberID = member3Response.data.memberDashboard.memberID;
      member3.accountIDs = member3Response.data.memberDashboard.accountIDS;
    } catch (err) {
      console.error("Error in beforeAll:", err);
      throw err;
    }
  });

  test("Login member 1", async () => {
    const loginResponse = await loginMember("1234567890");
    expect(loginResponse.jwt).toBeTruthy();
    member1.jwt = loginResponse.jwt;
    await delay(DELAY_MS);
  });

  test("Get member by handle and account by handle", async () => {
    // Get member by handle
    const memberResponse = await getMemberByHandle("263788435091", "");
    expect(memberResponse.data.memberData.memberID).toBe(bennitaData.memberID);
    await delay(DELAY_MS);

    // Get account by handle
    const accountResponse = await getAccountByHandle("vimbisopay_trust", "");
    expect(accountResponse.data.accountData.accountID).toBe(bennitaData.accountID);
    await delay(DELAY_MS);
  });

  test("Create and accept secured credex", async () => {
    // Create secured credex from vimbisopay_trust to member1
    const createResponse = await createCredex(
      bennitaData.memberID,
      bennitaData.accountID,
      member1.accountIDs[0],
      "USD",
      11,
      "PURCHASE",
      "OFFERS",
      true,
      ""
    );
    credexIDs.secured11USD = createResponse.data.createCredexData.credex.credexID;

    // Member1 accepts the credex
    await acceptCredex(credexIDs.secured11USD, member1.memberID, member1.jwt);
  });

  test("Create and accept $10 credex, fail $0.01 credex (daily limit)", async () => {
    // Member1 creates $10 credex to member2
    const create10Response = await createCredex(
      member1.memberID,
      member1.accountIDs[0],
      member2.accountIDs[0],
      "USD",
      10,
      "PURCHASE",
      "OFFERS",
      true,
      member1.jwt
    );
    credexIDs.unsecured10USD = create10Response.data.createCredexData.credex.credexID;

    // Member2 accepts the credex
    await acceptCredex(credexIDs.unsecured10USD, member2.memberID, member2.jwt);

    // Member1 attempts to create $0.01 credex (should fail due to daily limit)
    try {
      await createCredex(
        member1.memberID,
        member1.accountIDs[0],
        member2.accountIDs[0],
        "USD",
        0.01,
        "PURCHASE",
        "OFFERS",
        true,
        member1.jwt
      );
      fail("Should have thrown error due to daily limit");
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });

  test("Create multiple credex and test cancel", async () => {
    // Member2 creates $5 credex to member3
    const create5Response = await createCredex(
      member2.memberID,
      member2.accountIDs[0],
      member3.accountIDs[0],
      "USD",
      5,
      "PURCHASE",
      "OFFERS",
      true,
      member2.jwt
    );
    credexIDs.unsecured5USD = create5Response.data.createCredexData.credex.credexID;

    // Member2 creates $2 credex to member3
    const create2Response = await createCredex(
      member2.memberID,
      member2.accountIDs[0],
      member3.accountIDs[0],
      "USD",
      2,
      "PURCHASE",
      "OFFERS",
      true,
      member2.jwt
    );
    credexIDs.unsecured2USD = create2Response.data.createCredexData.credex.credexID;

    // Member2 creates $1 credex to member3
    const create1Response = await createCredex(
      member2.memberID,
      member2.accountIDs[0],
      member3.accountIDs[0],
      "USD",
      1,
      "PURCHASE",
      "OFFERS",
      true,
      member2.jwt
    );
    credexIDs.unsecured1USD = create1Response.data.createCredexData.credex.credexID;

    // Member3 accepts credexes in bulk
    await acceptCredexBulk(
      [credexIDs.unsecured5USD, credexIDs.unsecured2USD],
      member3.memberID,
      member3.jwt
    );

    // Member2 cancels the $1 credex
    await cancelCredex(credexIDs.unsecured1USD, member2.memberID, member2.jwt);
  });

  test("Create credex and test balance limits", async () => {
    // Member3 creates $7 credex to member1
    const create7Response = await createCredex(
      member3.memberID,
      member3.accountIDs[0],
      member1.accountIDs[0],
      "USD",
      7,
      "PURCHASE",
      "OFFERS",
      true,
      member3.jwt
    );
    credexIDs.unsecured7USD = create7Response.data.createCredexData.credex.credexID;

    // Member1 accepts the credex
    await acceptCredex(credexIDs.unsecured7USD, member1.memberID, member1.jwt);

    // Member3 attempts to create $0.01 credex (should fail due to balance)
    try {
      await createCredex(
        member3.memberID,
        member3.accountIDs[0],
        member1.accountIDs[0],
        "USD",
        0.01,
        "PURCHASE",
        "OFFERS",
        true,
        member3.jwt
      );
      fail("Should have thrown error due to insufficient balance");
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });

  test("Test dashboard and decline credex", async () => {
    // Get member1's dashboard
    const dashboardResponse = await getMemberDashboardByPhone("1234567890", member1.jwt);
    const pendingInData = dashboardResponse.data.accountDashboards[0].pendingInData;
    expect(pendingInData).toBeTruthy();

    // Only try to find if pendingInData is an array
    if (Array.isArray(pendingInData)) {
      const offeredCredex = pendingInData.find(
        (offer: any) => offer.credexID === credexIDs.secured11USD
      );
      expect(offeredCredex).toBeTruthy();
    }

    // Member1 declines the credex
    await declineCredex(credexIDs.secured11USD, member1.memberID, member1.jwt);
  });

  test("Create credex after decline and test ledger", async () => {
    // Member3 creates $6 credex to member1
    const create6Response = await createCredex(
      member3.memberID,
      member3.accountIDs[0],
      member1.accountIDs[0],
      "USD",
      6,
      "PURCHASE",
      "OFFERS",
      true,
      member3.jwt
    );
    credexIDs.unsecured6USD = create6Response.data.createCredexData.credex.credexID;

    // Member1 gets credex details
    const getCredexResponse = await getCredex(credexIDs.unsecured6USD, member1.jwt);
    expect(getCredexResponse.data.credexID).toBe(credexIDs.unsecured6USD);

    // Get member1's ledger
    const ledgerResponse = await getLedger(member1.accountIDs[0], member1.jwt);
    expect(ledgerResponse.data).toBeTruthy();
  });
});
