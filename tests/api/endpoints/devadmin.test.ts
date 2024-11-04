import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

// Get operation from environment variables
const operation = process.env.TEST_OPERATION || '';

describe("DevAdmin Operations", () => {
  describe(operation, () => {
    // Using conditional test execution
    (operation === "cleardevdbs" ? it : it.skip)("cleardevdbs", async () => {
      console.log("\nClearing dev DBs...");
      const response = await authRequest("/devadmin/clearDevDBs", {});
      console.log("Clear DBs response:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    (operation === "forcedco" ? it : it.skip)("forcedco", async () => {
      console.log("\nForcing DCO...");
      const response = await authRequest("/devadmin/forceDCO", {});
      console.log("Force DCO response:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    (operation === "clearforce" ? it : it.skip)("clearforce", async () => {
      console.log("\nClearing dev DBs...");
      let response = await authRequest("/devadmin/clearDevDBs", {});
      console.log("Clear DBs response:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);

      console.log("\nForcing DCO...");
      response = await authRequest("/devadmin/forceDCO", {});
      console.log("Force DCO response:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });
  });
});
