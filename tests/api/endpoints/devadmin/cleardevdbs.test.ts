import axios from "../../../setup";
import { delay, DELAY_MS } from "../../utils/delay";

describe("clearDevDBs DevAdmin Operation", () => {
  it("clearDevDBs", async () => {
    console.log("\nClearing dev DBs...");
    const response = await axios.post("/devadmin/clearDevDBs", {}, {
      headers: {
        'x-client-api-key': process.env.CLIENT_API_KEY || ''
      }
    });
    console.log("Clear DBs response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
