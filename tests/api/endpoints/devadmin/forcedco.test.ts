import axios from "../../../setup";
import { delay, DELAY_MS } from "../../utils/delay";

describe("forceDCO DevAdmin Operation", () => {
  it("forceDCO", async () => {
    console.log("\nForcing DCO...");
    const response = await axios.post("/devadmin/forceDCO", {}, {
      headers: {
        'x-client-api-key': process.env.CLIENT_API_KEY || ''
      }
    });
    console.log("Force DCO response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
