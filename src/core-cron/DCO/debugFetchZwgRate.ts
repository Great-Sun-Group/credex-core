import { fetchZwgRate } from "./fetchZwgRate";
import axios, { AxiosError } from "axios";
import https from "https";

async function main() {
  try {
    console.log("Starting debug process...");

    console.log("Fetching ZWG rates...");

    // Directly fetch the data to inspect it
    const RBZ_URL = "https://www.rbz.co.zw/index.php";
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // To Ignore SSL errors in dev
    });

    console.log("Sending request to RBZ URL...");
    const { data } = await axios.get(RBZ_URL, {
      httpsAgent,
      timeout: 10000, // 10 seconds timeout
    });

    console.log("Received data type:", typeof data);
    console.log("Received data length:", data.length);
    console.log("First 500 characters of data:", data.substring(0, 500));

    // Now call the actual function
    console.log("Calling fetchZwgRate function...");
    const rates = await fetchZwgRate();
    console.log("Fetched rates:", JSON.stringify(rates, null, 2));

    console.log("Debug process completed successfully.");
  } catch (error) {
    console.error("An error occurred during the debug process:");
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.message);
      if (error.response) {
        console.error("Error response:", error.response.data);
        console.error("Error status:", error.response.status);
        console.error("Error headers:", error.response.headers);
      }
    } else {
      console.error("Unknown error:", error);
    }
  }
}

main().catch((error) => {
  console.error("Unhandled error in main function:");
  if (error instanceof Error) {
    console.error(error.message);
    console.error(error.stack);
  } else {
    console.error("Unknown error:", error);
  }
});
