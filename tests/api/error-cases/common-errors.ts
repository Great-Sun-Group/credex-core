import axios from "../../setup";
import { AxiosResponse } from "axios";

export interface ErrorTestConfig {
  endpoint: string;
  headers: { [key: string]: string };
  validationField?: string;
  errorCode?: string;
  testCredexID?: string;
  customPayload?: any;
  expectedStatus?: number;
  actor?: string;
  token?: string;
  validationErrorCode?: string;
}

export const testMissingRequiredField = async (
  config: ErrorTestConfig
): Promise<void> => {
  const headers = {
    ...config.headers,
    ...(config.token && { Authorization: `Bearer ${config.token}` })
  };

  const response = await axios.post(
    config.endpoint,
    config.customPayload || {},
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
          code: config.validationErrorCode || "VALIDATION_ERROR",
          reason: expect.any(String),
          field: config.validationField,
        },
      },
      dashboard: {},
    },
  });
};

export const testUnauthorized = async (
  config: ErrorTestConfig
): Promise<void> => {
  const response = await axios.post(
    config.endpoint,
    config.customPayload || { credexID: "00000000-0000-4000-a000-000000000000" },
    {
      headers: config.headers,
      validateStatus: (status) => status === 401,
    }
  );

  expect(response.status).toBe(401);
  expect(response.data).toMatchObject({
    message: "Authentication required",
  });
};

export const testNotFound = async (
  config: ErrorTestConfig
): Promise<void> => {
  const testID = config.testCredexID || "00000000-0000-4000-a000-000000000000";
  const response = await axios.post(
    config.endpoint,
    config.customPayload || { credexID: testID },
    {
      headers: config.headers,
      validateStatus: (status) => status === (config.expectedStatus || 400),
    }
  );

  expect(response.status).toBe(config.expectedStatus || 400);
  expect(response.data).toMatchObject({
    message: expect.any(String),
    data: {
      action: {
        id: testID,
        type: "ERROR_INTERNAL",
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
        ),
        actor: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ),
        details: {
          code: config.errorCode || "NOT_FOUND",
          reason: expect.any(String),
        },
      },
      dashboard: {},
    },
  });
};

export const testAlreadyProcessed = async (
  config: ErrorTestConfig
): Promise<void> => {
  const response = await axios.post(
    config.endpoint,
    config.customPayload || { credexID: config.testCredexID },
    {
      headers: config.headers,
      validateStatus: (status) => status === 400,
    }
  );

  expect(response.status).toBe(400);
  expect(response.data).toMatchObject({
    message: expect.any(String),
    data: {
      action: {
        id: config.testCredexID,
        type: "ERROR_INTERNAL",
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
        ),
        actor: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ),
        details: {
          code: config.errorCode || "ALREADY_PROCESSED",
          reason: expect.any(String),
        },
      },
      dashboard: {},
    },
  });
};
