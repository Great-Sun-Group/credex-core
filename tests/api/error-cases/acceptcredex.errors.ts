import {
  ErrorTestConfig,
  testMissingRequiredField,
  testUnauthorized,
  testNotFound,
  testAlreadyProcessed,
} from "./common-errors";

describe("acceptCredex Error Cases", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  const config: ErrorTestConfig = {
    endpoint: "/acceptCredex",
    headers,
    validationField: "credexID",
    errorCode: "ACCEPT_FAILED",
  };

  it("missing credexID", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token] = params;
    await testMissingRequiredField({
      ...config,
      token
    });
  });

  it("unauthorized (no token)", async () => {
    await testUnauthorized(config);
  });

  it("not authorized to accept credex", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token] = params;

    if (!token) {
      throw new Error("Token required for authentication");
    }

    await testNotFound({
      ...config,
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
      },
    });
  });

  it("credex not found", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token] = params;

    if (!token) {
      throw new Error("Token required for authentication");
    }

    await testNotFound({
      ...config,
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
      },
    });
  });

  it("credex already accepted", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, credexID] = params;

    if (!token || !credexID) {
      throw new Error("Token and credexID required for test");
    }

    await testAlreadyProcessed({
      ...config,
      errorCode: "ACCEPT_FAILED",
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
      },
      testCredexID: credexID,
    });
  });
});
