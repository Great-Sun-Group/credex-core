import { delay, DELAY_MS } from "../utils/delay";

// Import tests in order of execution
import "./setup.test";
import "./auth.test";
import "./credex.test";
import "./dashboard.test";

describe("Integration Tests", () => {
  // Increase timeout for the entire test suite
  jest.setTimeout(300000); // 5 minutes

  beforeAll(async () => {
    // Add initial delay to ensure any previous rate limits have expired
    await delay(DELAY_MS * 5);
  });

  it("should run all integration tests in order", () => {
    // This empty test ensures the describe block is valid
    // The actual tests are imported above and will run in sequence
    expect(true).toBe(true);
  });

  afterAll(async () => {
    // Add final delay to ensure rate limits don't affect subsequent test runs
    await delay(DELAY_MS * 5);
  });
});

// Export an empty object to satisfy TypeScript
export {};
