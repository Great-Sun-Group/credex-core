import { authRequest } from "../../utils/request";
import { delay, DELAY_MS } from "../../utils/delay";

describe("forceDCO DevAdmin Operation", () => {
  it("forceDCO", async () => {
    console.log("\nForcing DCO...");
    const response = await authRequest("/devadmin/forceDCO", {});
    console.log("Force DCO response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
