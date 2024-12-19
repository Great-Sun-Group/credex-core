import axios from "../../setup";
import { delay, DELAY_MS } from "../utils/delay";

describe("login Endpoint Test", () => {
  const headers = {
    'x-client-api-key': process.env.CLIENT_API_KEY || ''
  };

  it("login successful with dashboard data", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone] = params;
    
    if (!phone) {
      throw new Error("Usage: npm test login <phone>");
    }

    console.log("\nLogging in member...");
    const response = await axios.post("/login", {
      phone: phone
    }, { headers });

    console.log("Login response:", JSON.stringify(response.data, null, 2));
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('message', 'Successfully logged in');
    expect(response.data).toHaveProperty('data');
    
    // Verify action object structure
    expect(response.data.data).toHaveProperty('action');
    expect(response.data.data.action).toMatchObject({
      type: 'MEMBER_LOGIN',
      details: {
        memberID: expect.any(String),
        phone: phone,
        token: expect.any(String)
      }
    });
    expect(response.data.data.action).toHaveProperty('id', expect.any(String));
    expect(response.data.data.action).toHaveProperty('timestamp', expect.any(String));
    expect(response.data.data.action).toHaveProperty('actor', expect.any(String));

    // Verify dashboard object structure
    expect(response.data.data).toHaveProperty('dashboard');
    expect(response.data.data.dashboard).toMatchObject({
      memberTier: expect.any(Number),
      remainingAvailableUSD: expect.any(Number),
      accounts: expect.any(Array)
    });

    await delay(DELAY_MS);
  });

  it("invalid phone number format", async () => {
    const response = await axios.post("/login", {
      phone: "invalid-phone"
    }, { 
      headers,
      validateStatus: (status) => status === 400
    });

    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('message');
    expect(response.data).toHaveProperty('data');
    expect(response.data.data).toHaveProperty('action');
    expect(response.data.data.action).toMatchObject({
      type: 'ERROR_VALIDATION',
      details: {
        code: expect.stringMatching(/^(INVALID_PHONE|MISSING_PHONE)$/),
        field: 'phone'
      }
    });
    expect(response.data.data).toHaveProperty('dashboard', {});

    await delay(DELAY_MS);
  });

  it("member not found", async () => {
    const response = await axios.post("/login", {
      phone: "+15555555555" // Non-existent phone number
    }, { 
      headers,
      validateStatus: (status) => status === 404
    });

    expect(response.status).toBe(404);
    expect(response.data).toHaveProperty('message', 'Member not found');
    expect(response.data.data).toHaveProperty('action');
    expect(response.data.data.action).toMatchObject({
      type: 'ERROR_NOT_FOUND',
      details: {
        code: 'NOT_FOUND',
        reason: 'Member not found'
      }
    });
    expect(response.data.data).toHaveProperty('dashboard', {});

    await delay(DELAY_MS);
  });

  // Note: 500 error test is optional since it requires simulating internal server errors
  // which might not be feasible in the test environment
});
