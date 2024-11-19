import { authRequest } from "../../utils/request";
import { delay, DELAY_MS } from "../../utils/delay";
import { validateAction, validateStatusCode } from "../../utils/validation";
import { testDataManager } from "../../utils/testData";

describe("Member Onboarding Flow", () => {
  // Test data
  const timestamp = Date.now().toString().slice(-7);
  const testPhone = `+1${timestamp}001`;
  let memberJWT: string;
  let memberID: string;

  test("Create new member", async () => {
    const response = await authRequest(
      "/onboardMember",
      {
        firstname: "Test",
        lastname: "Member",
        phone: testPhone,
        defaultDenom: "USD"
      },
      undefined,
      {
        headers: {
          "x-client-api-key": process.env.CLIENT_API_KEY || ""
        }
      }
    );

    // Validate response
    validateStatusCode(response.status, 201);
    validateAction(response.data.data.action);
    
    // Store JWT and memberID
    memberJWT = response.data.data.action.details.token;
    memberID = response.data.data.action.details.memberID;
    expect(memberJWT).toBeTruthy();
    expect(memberID).toBeTruthy();

    // Track for cleanup
    testDataManager.trackMemberID(memberID);
    await delay(DELAY_MS);
  });

  test("Login with new member", async () => {
    const response = await authRequest(
      "/login",
      {
        phone: testPhone
      },
      undefined,
      {
        headers: {
          "x-client-api-key": process.env.CLIENT_API_KEY || ""
        }
      }
    );

    // Validate response
    validateStatusCode(response.status, 200);
    validateAction(response.data.data.action);
    
    // Verify JWT
    const loginJWT = response.data.data.action.details.token;
    expect(loginJWT).toBeTruthy();
    await delay(DELAY_MS);
  });

  test("Get member dashboard", async () => {
    const response = await authRequest(
      "/getMemberDashboardByPhone",
      {
        phone: testPhone
      },
      memberJWT
    );

    // Validate response
    validateStatusCode(response.status, 200);
    validateAction(response.data.data.action);
    
    // Verify dashboard data
    const dashboard = response.data.data.dashboard;
    expect(dashboard.accounts).toBeDefined();
    expect(dashboard.accounts.length).toBeGreaterThan(0);
    expect(dashboard.accounts[0].accountType).toBe("PERSONAL");
    await delay(DELAY_MS);
  });

  test("Get member by handle", async () => {
    // First get member handle from dashboard
    const dashboardResponse = await authRequest(
      "/getMemberDashboardByPhone",
      {
        phone: testPhone
      },
      memberJWT
    );
    const memberHandle = dashboardResponse.data.data.action.details.memberHandle;
    expect(memberHandle).toBeTruthy();

    // Get member by handle
    const response = await authRequest(
      "/getMemberByHandle",
      {
        memberHandle
      },
      memberJWT
    );

    // Validate response
    validateStatusCode(response.status, 200);
    validateAction(response.data.data.action);
    
    // Verify member data
    expect(response.data.data.action.details.memberID).toBe(memberID);
    await delay(DELAY_MS);
  });

  test("Get existing member (Bennita)", async () => {
    const response = await authRequest(
      "/getMemberByHandle",
      {
        memberHandle: "263788435091"
      },
      memberJWT
    );

    // Validate response
    validateStatusCode(response.status, 200);
    validateAction(response.data.data.action);
    
    // Store Bennita's member ID for later tests
    const bennitaMemberID = response.data.data.action.details.memberID;
    expect(bennitaMemberID).toBeTruthy();
    await delay(DELAY_MS);
  });

  test("Get vimbisopay_trust account", async () => {
    const response = await authRequest(
      "/getAccountByHandle",
      {
        accountHandle: "vimbisopay_trust"
      },
      memberJWT
    );

    // Validate response
    validateStatusCode(response.status, 200);
    validateAction(response.data.data.action);
    
    // Store trust account ID for later tests
    const trustAccountID = response.data.data.action.details.accountID;
    expect(trustAccountID).toBeTruthy();
    await delay(DELAY_MS);
  });

  afterAll(async () => {
    // Cleanup will be handled by test data manager
    await delay(DELAY_MS);
  });
});
