import axios from "../../../setup";
import { delay, DELAY_MS } from "../../utils/delay";

describe("forceDCO DevAdmin Operation", () => {
  it("forceDCO", async () => {
    // Extend timeout to 2 minutes for this specific test
    jest.setTimeout(120000);
    
    console.log("\nForcing DCO...");
    const response = await axios.post("/devadmin/forceDCO", {}, {
      headers: {
        'x-dev-admin-key': process.env.DEV_ADMIN_KEY || ''
      }
    });
    console.log("Force DCO response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
