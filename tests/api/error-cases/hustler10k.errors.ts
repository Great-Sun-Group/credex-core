import {
  ErrorTestConfig,
  testMissingRequiredField,
  testUnauthorized,
  testNotFound,
} from "./common-errors";
import axios from "../../setup";

describe("hustler10k Error Cases", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  const config: ErrorTestConfig = {
    endpoint: "/hustler10k",
    headers,
    validationField: "personalAccountID",
  };

  it("missing personalAccountID", async () => {
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
        personalAccountID: "00000000-0000-4000-a000-000000000000",
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
      "/hustler10k",
      {
        personalAccountID: "00000000-0000-4000-a000-000000000000", // Non-existent account
      },
      {
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status === 404,
      }
    );

    expect(response.status).toBe(404);
    expect(response.data).toMatchObject({
      message: expect.any(String),
      data: {
        action: {
          id: null,
          type: "ERROR_NOT_FOUND",
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
          ),
          actor: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          ),
          details: {
            code: "NOT_FOUND",
            reason: expect.any(String),
          },
        },
        dashboard: {},
      },
    });
  });

  it("not authorized for account", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, personalAccountID] = params;

    if (!token || !personalAccountID) {
      throw new Error("Token and personalAccountID required for test");
    }

    const response = await axios.post(
      "/hustler10k",
      {
        personalAccountID,
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

  it("greatsun_ops account not found", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, personalAccountID] = params;

    if (!token || !personalAccountID) {
      throw new Error("Token and personalAccountID required for test");
    }

    const response = await axios.post(
      "/hustler10k",
      {
        personalAccountID,
      },
      {
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status === 500,
      }
    );

    expect(response.status).toBe(500);
    expect(response.data).toMatchObject({
      message: expect.any(String),
      data: {
        action: {
          id: null,
          type: "ERROR_INTERNAL",
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
          ),
          actor: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          ),
          details: {
            code: "GREATSUN_ACCOUNT_NOT_FOUND",
            reason: expect.any(String),
          },
        },
        dashboard: {},
      },
    });
  });

  it("credex creation failed", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, personalAccountID] = params;

    if (!token || !personalAccountID) {
      throw new Error("Token and personalAccountID required for test");
    }

    const response = await axios.post(
      "/hustler10k",
      {
        personalAccountID,
      },
      {
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status === 500,
      }
    );

    expect(response.status).toBe(500);
    expect(response.data).toMatchObject({
      message: expect.any(String),
      data: {
        action: {
          id: null,
          type: "ERROR_INTERNAL",
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
          ),
          actor: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          ),
          details: {
            code: "CREDEX_CREATE_FAILED",
            reason: expect.any(String),
          },
        },
        dashboard: {},
      },
    });
  });

  it("credex acceptance failed", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, personalAccountID] = params;

    if (!token || !personalAccountID) {
      throw new Error("Token and personalAccountID required for test");
    }

    const response = await axios.post(
      "/hustler10k",
      {
        personalAccountID,
      },
      {
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status === 500,
      }
    );

    expect(response.status).toBe(500);
    expect(response.data).toMatchObject({
      message: expect.any(String),
      data: {
        action: {
          id: null,
          type: "ERROR_INTERNAL",
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
          ),
          actor: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          ),
          details: {
            code: "CREDEX_ACCEPT_FAILED",
            reason: expect.any(String),
          },
        },
        dashboard: {},
      },
    });
  });

  it("tier update failed", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, personalAccountID] = params;

    if (!token || !personalAccountID) {
      throw new Error("Token and personalAccountID required for test");
    }

    const response = await axios.post(
      "/hustler10k",
      {
        personalAccountID,
      },
      {
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status === 500,
      }
    );

    expect(response.status).toBe(500);
    expect(response.data).toMatchObject({
      message: expect.any(String),
      data: {
        action: {
          id: null,
          type: "ERROR_INTERNAL",
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
          ),
          actor: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          ),
          details: {
            code: "TIER_UPDATE_FAILED",
            reason: expect.any(String),
          },
        },
        dashboard: {},
      },
    });
  });
});
