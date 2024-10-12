import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import https from 'https';

dotenv.config();

const CODESPACE_URL = process.env.CODESPACE_NAME 
  ? `https://${process.env.CODESPACE_NAME}-3000.preview.app.github.dev`
  : null;
const BASE_URL = CODESPACE_URL || "http://localhost:3000";
const API_VERSION = "/api/v1";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Create a custom https agent that ignores SSL certificate errors
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

describe("Basic API Test", () => {
  it("should be able to reach the login endpoint", async () => {
    const url = `${BASE_URL}${API_VERSION}/member/login`;
    console.log(`Attempting to connect to: ${url}`);
    
    try {
      const config = {
        method: 'post',
        url: url,
        data: { phone: "263778177125" },
        headers: {
          "Content-Type": "application/json",
          "X-Github-Token": GITHUB_TOKEN
        },
        httpsAgent: httpsAgent
      };

      console.log('Request config:', JSON.stringify(config, null, 2));

      const response = await axios(config);
      
      console.log("Response status:", response.status);
      console.log("Response data:", response.data);
      
      expect(response.status).toBe(200);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Axios Error:", error.message);
        console.error("Attempted URL:", url);
        if (error.response) {
          console.error("Response status:", error.response.status);
          console.error("Response data:", error.response.data);
        } else if (error.request) {
          console.error("No response received. Request:", error.request);
        }
        console.error("Error config:", error.config);
      } else {
        console.error("Unexpected error:", error);
      }
      throw error;
    }
  });
});
