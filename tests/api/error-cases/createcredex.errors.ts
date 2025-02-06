import {
  ErrorTestConfig,
  testMissingRequiredField,
  testUnauthorized,
  testNotFound,
} from "./common-errors";
import axios from "../../setup";

describe("createCredex Error Cases", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  const config: ErrorTestConfig = {
    endpoint: "/createCredex",
    headers,
    validationField: "issuerAccountID", // One of the required fields
  };

  it("missing required fields", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token] = params;
    await testMissingRequiredField({
      ...config,
      token
    });
  });

  it("unauthorized (no token)", async () => {
    await testUnauthorized({
      ...config,
      customPayload: {
        issuerAccountID: "00000000-0000-4000-a000-000000000000",
        receiverAccountID: "00000000-0000-4000-a000-000000000001",
        Denomination: "USD",
        InitialAmount: 100,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
    });
  });

  it("invalid amount", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, issuerAccountID, receiverAccountID] = params;

    if (!token || !issuerAccountID || !receiverAccountID) {
      throw new Error("Token and account IDs required for test");
    }

    const response = await axios.post(
      "/createCredex",
      {
        issuerAccountID,
        receiverAccountID,
        Denomination: "USD",
        InitialAmount: -100, // Invalid negative amount
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      {
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status === 400,
      }
    );

    expect(response.status).toBe(400);
    expect(response.data).toMatchObject({
      message: expect.any(String),
      data: {
        action: {
          id: null,
          type: "ERROR_VALIDATION",
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
          ),
          actor: "system",
          details: {
            code: "VALIDATION_ERROR",
            reason: expect.any(String),
            field: "InitialAmount",
          },
        },
        dashboard: {},
      },
    });
  });

  it("invalid denomination", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, issuerAccountID, receiverAccountID] = params;

    if (!token || !issuerAccountID || !receiverAccountID) {
      throw new Error("Token and account IDs required for test");
    }

    const response = await axios.post(
      "/createCredex",
      {
        issuerAccountID,
        receiverAccountID,
        Denomination: "INVALID",
        InitialAmount: 100,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      {
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status === 400,
      }
    );

    expect(response.status).toBe(400);
    expect(response.data).toMatchObject({
      message: expect.any(String),
      data: {
        action: {
          id: null,
          type: "ERROR_VALIDATION",
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
          ),
          actor: "system",
          details: {
            code: "VALIDATION_ERROR",
            reason: expect.any(String),
            field: "Denomination",
          },
        },
        dashboard: {},
      },
    });
  });

  it("account not found", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token] = params;

    if (!token) {
      throw new Error("Token required for authentication");
    }

    const response = await axios.post(
      "/createCredex",
      {
        issuerAccountID: "00000000-0000-4000-a000-000000000000", // Non-existent account
        receiverAccountID: "00000000-0000-4000-a000-000000000001", // Non-existent account
        Denomination: "USD",
        InitialAmount: 100,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      {
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status === 403,
      }
    );

    expect(response.status).toBe(403);
    expect(response.data).toMatchObject({
      message: expect.any(String),
      data: {
        action: {
          id: null,
          type: "ERROR_UNAUTHORIZED",
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
          ),
          actor: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          ),
          details: {
            code: "FORBIDDEN",
            reason: expect.any(String),
          },
        },
        dashboard: {},
      },
    });
  });
});
