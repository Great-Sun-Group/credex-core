import { authRequest } from "../../utils/request";
import { delay, DELAY_MS } from "../../utils/delay";

describe("clearforce DevAdmin Operation", () => {
  it("clearforce", async () => {
    // First clear dev DBs
    console.log("\nClearing dev DBs...");
    let response = await authRequest("/devadmin/clearDevDBs", {});
    console.log("Clear DBs response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);

    // Then force DCO
    console.log("\nForcing DCO...");
    response = await authRequest("/devadmin/forceDCO", {});
    console.log("Force DCO response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
