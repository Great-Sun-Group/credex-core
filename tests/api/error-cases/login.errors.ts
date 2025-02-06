import {
  ErrorTestConfig,
  testMissingRequiredField,
} from "./common-errors";
import axios from "../../setup";

describe("login Error Cases", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  const config: ErrorTestConfig = {
    endpoint: "/login",
    headers,
    validationField: "phone",
  };

  it("missing phone number", async () => {
    await testMissingRequiredField({
      ...config,
      validationErrorCode: "MISSING_PHONE",
    });
  });

  it("invalid phone number format", async () => {
    const response = await axios.post(
      "/login",
      {
        phone: "invalid-phone",
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
          ), // ISO 8601
          actor: "system",
          details: {
            code: expect.stringMatching(/^(INVALID_PHONE|MISSING_PHONE)$/),
            reason: expect.any(String),
            field: "phone",
          },
        },
      },
    });
    expect(response.data.data).toHaveProperty("dashboard", {});
  });

  it("member not found", async () => {
    const response = await axios.post(
      "/login",
      {
        phone: "99999999999", // Non-existent phone number
      },
      {
        headers,
        validateStatus: (status) => status === 404,
      }
    );

    expect(response.status).toBe(404);
    expect(response.data).toMatchObject({
      message: "Member not found",
      data: {
        action: {
          id: null,
          type: "ERROR_NOT_FOUND",
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
          ), // ISO 8601
          actor: "system",
          details: {
            code: "NOT_FOUND",
            reason: "Member not found",
          },
        },
      },
    });
    expect(response.data.data).toHaveProperty("dashboard", {});
  });
});
