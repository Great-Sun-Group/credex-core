import axios from "../../../setup";
import { delay, DELAY_MS } from "../../utils/delay";

describe("clearForce DevAdmin Operation", () => {
  it("clearForce", async () => {
    try {
      // First clear the databases
      console.log("\nClearing dev DBs...");
      const clearResponse = await axios.post("/devadmin/clearDevDBs", {}, {
        headers: {
          'x-client-api-key': process.env.CLIENT_API_KEY || ''
        }
      });
      console.log("Clear DBs response:", clearResponse.data);
      expect(clearResponse.status).toBe(200);
      await delay(DELAY_MS);

      // Then force DCO
      console.log("\nForcing DCO...");
      const forceResponse = await axios.post("/devadmin/forceDCO", {}, {
        headers: {
          'x-client-api-key': process.env.CLIENT_API_KEY || ''
        }
      });
      console.log("Force DCO response:", forceResponse.data);
      expect(forceResponse.status).toBe(200);
      await delay(DELAY_MS);

      console.log("\nClear and Force operations completed successfully");
    } catch (error: any) {
      if (error.response) {
        console.error("Operation failed:", {
          status: error.response.status,
          data: error.response.data
        });
      } else {
        console.error("Operation failed:", error.message);
      }
      throw error;
    }
  });
});
