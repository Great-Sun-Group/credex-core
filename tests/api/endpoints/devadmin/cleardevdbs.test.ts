import { authRequest } from "../../utils/request";
import { delay, DELAY_MS } from "../../utils/delay";

describe("clearDevDBs DevAdmin Operation", () => {
  it("clearDevDBs", async () => {
    console.log("\nClearing dev DBs...");
    const response = await authRequest("/devadmin/clearDevDBs", {});
    console.log("Clear DBs response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
