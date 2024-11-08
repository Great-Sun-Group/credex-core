import axios from "../../../setup";
import { delay, DELAY_MS } from "../../utils/delay";

describe("clearForce DevAdmin Operation", () => {
  it("clearForce", async () => {
    console.log("\nClearing force...");
    const response = await axios.post("/devadmin/clearForce", {}, {
      headers: {
        'x-client-api-key': process.env.CLIENT_API_KEY || ''
      }
    });
    console.log("Clear force response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
