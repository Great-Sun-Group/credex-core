import { delay, DELAY_MS } from "../utils/delay";

// Import test suites in order of execution
import "../endpoints/member/onboarding.test";
import "../endpoints/credex/secured_flow.test";
import "../endpoints/credex/bulk_operations.test";
import "../endpoints/credex/secured_errors.test";

describe("Phase 1 Integration Tests", () => {
  // Increase timeout for the entire test suite
  jest.setTimeout(300000); // 5 minutes

  beforeAll(async () => {
    // Add initial delay to ensure any previous rate limits have expired
    await delay(DELAY_MS * 5);
    console.log("\nStarting Phase 1 Integration Tests...");
    console.log("Test suites will run in the following order:");
    console.log("1. Member Onboarding");
    console.log("2. Secured Credex Flow");
    console.log("3. Bulk Operations");
    console.log("4. Error Cases");
  });

  it("should run all test suites in sequence", () => {
    // This empty test ensures the describe block is valid
    // The actual tests are imported above and will run in sequence
    expect(true).toBe(true);
  });

  afterAll(async () => {
    // Add final delay to ensure rate limits don't affect subsequent test runs
    await delay(DELAY_MS * 5);
    console.log("\nPhase 1 Integration Tests completed.");
  });
});

// Export an empty object to satisfy TypeScript
export {};
