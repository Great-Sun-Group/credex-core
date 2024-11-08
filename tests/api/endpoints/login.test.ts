import axios from "../../setup";
import { delay, DELAY_MS } from "../utils/delay";

describe("login Endpoint Test", () => {
  it("login", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone] = params;
    
    if (!phone) {
      throw new Error("Usage: npm test login <phone>");
    }

    console.log("\nLogging in member...");
    const response = await axios.post("/login", {
      phone: phone
    }, {
      headers: {
        'x-client-api-key': process.env.CLIENT_API_KEY || ''
      }
    });
    console.log("Login response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
