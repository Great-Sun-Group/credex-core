import axios from "../../setup";

describe("DevAdmin API Endpoints", () => {
  describe("POST /devadmin/clearDevDBs", () => {
    it("cleardevdbs", async () => {
      try {
        const response = await axios.post("/devadmin/clearDevDBs");
        expect(response.status).toBe(200);
        expect(response.data).toBeDefined();
      } catch (error) {
        // Fail test if request throws
        expect(error).toBeUndefined();
      }
    });
  });

  describe("POST /devadmin/forceDCO", () => {
    it("forcedco", async () => {
      try {
        const response = await axios.post("/devadmin/forceDCO");
        expect(response.status).toBe(200);
        expect(response.data).toBeDefined();
      } catch (error) {
        // Fail test if request throws
        expect(error).toBeUndefined();
      }
    });
  });

  describe("POST /devadmin/gimmeSecured", () => {
    it("should gimmeSecured", async () => {
      try {
        const requestBody = {
          accountHandle: "263778177125",
          denom: "USD",
          amount: 100
        };
        const response = await axios.post("/devadmin/gimmeSecured", requestBody);
        expect(response.status).toBe(200);
        expect(response.data).toBeDefined();
      } catch (error) {
        // Fail test if request throws
        expect(error).toBeUndefined();
      }
    });
  });
});
