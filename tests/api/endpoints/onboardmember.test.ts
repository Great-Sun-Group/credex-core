import axios from "../../setup";
import { delay, DELAY_MS } from "../utils/delay";

describe("onboardMember Endpoint Test", () => {
  it("onboardMember", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [firstname, lastname, phone, defaultDenom] = params;
    
    if (!firstname || !lastname || !phone || !defaultDenom) {
      throw new Error("Usage: npm test onboardmember <firstname> <lastname> <phone> <defaultDenom>");
    }

    console.log("\nOnboarding member...");
    const response = await axios.post("/onboardMember", {
      firstname,
      lastname,
      phone,
      defaultDenom
    }, {
      headers: {
        'x-client-api-key': process.env.CLIENT_API_KEY
      }
    });
    console.log("Onboard member response:", response.data);
    expect(response.status).toBe(201);  // Changed from 200 to 201 for resource creation
    await delay(DELAY_MS);
  });
});
