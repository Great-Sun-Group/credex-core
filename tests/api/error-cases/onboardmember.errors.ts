import {
  ErrorTestConfig,
  testMissingRequiredField,
} from "./common-errors";
import axios from "../../setup";

describe("onboardMember Error Cases", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  const config: ErrorTestConfig = {
    endpoint: "/onboardMember",
    headers,
    validationField: "firstname", // One of the required fields
  };

  it("missing required fields", async () => {
    await testMissingRequiredField(config);
  });

  it("invalid phone number format", async () => {
    const response = await axios.post(
      "/onboardMember",
      {
        firstname: "John",
        lastname: "Smith",
        phone: "invalid-phone",
        defaultDenom: "USD"
      },
      {
        headers,
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
            code: "INVALID_PHONE",
            reason: expect.any(String),
            field: "phone",
          },
        },
        dashboard: {},
      },
    });
  });

  it("invalid denomination", async () => {
    const response = await axios.post(
      "/onboardMember",
      {
        firstname: "John",
        lastname: "Smith",
        phone: "15555555555",
        defaultDenom: "INVALID"
      },
      {
        headers,
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
            field: "defaultDenom",
          },
        },
        dashboard: {},
      },
    });
  });

  it("duplicate handle", async () => {
    const response = await axios.post(
      "/onboardMember",
      {
        firstname: "John",
        lastname: "Smith", 
        phone: "+15555555555",
        defaultDenom: "USD"
      },
      {
        headers,
        validateStatus: (status) => status === 409,
      }
    );

    expect(response.status).toBe(409);
    expect(response.data).toMatchObject({
      message: expect.stringContaining("Member handle already in use"),
      data: {
        action: {
          id: null,
          type: "ERROR_VALIDATION",
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
          ),
          actor: "system",
          details: {
            code: "DUPLICATE_HANDLE",
            reason: expect.any(String),
          },
        },
        dashboard: {},
      },
    });
  });
});
