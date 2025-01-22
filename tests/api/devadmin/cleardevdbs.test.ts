import axios from "../../setup";

describe("clearDevDBs DevAdmin Operation", () => {
  it("clearDevDBs", async () => {
    console.log("\nClearing dev DBs...");
    const response = await axios.post("/devadmin/clearDevDBs", {}, {
      headers: {
        'x-dev-admin-key': process.env.DEV_ADMIN_KEY || ''
      }
    });
    console.log("Clear DBs response:", response.data);
    expect(response.status).toBe(200);
  });
});
