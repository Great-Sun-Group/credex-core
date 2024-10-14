import axios from "axios";
import https from "https";

describe("Basic API Test", () => {
  it("should be able to reach the login endpoint", async () => {
    const url = "http://server:5000/api/v1/member/login";
    const data = { phone: "263778177125" };

    const config = {
      method: "post",
      url: url,
      data: data,
      headers: {
        "Content-Type": "application/json",
        "X-Github-Token": process.env.GITHUB_TOKEN,
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    };

    console.log("Attempting to connect to:", url);

    try {
      console.log("Request config:", JSON.stringify(config, null, 2));

      const response = await axios(config);

      console.log("Response status:", response.status);
      console.log("Response data:", response.data);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("token");
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
