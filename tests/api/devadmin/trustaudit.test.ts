import axios from "../../setup";

describe("Trust Account Audit DevAdmin Operation", () => {
  // Added 2 minute timeout since these operations take longer
  it("runTrustAudit", async () => {
    try {
      console.log("\nRunning trust account audit...");
      const auditResponse = await axios.post("/devadmin/runTrustAudit", {}, {
        headers: {
          "x-dev-admin-key": process.env.DEV_ADMIN_KEY || ""
        }
      });
      console.log("Trust audit response:", auditResponse.data);
      expect(auditResponse.status).toBe(200);

      // Verify response structure
      expect(auditResponse.data).toHaveProperty("message");
      expect(auditResponse.data).toHaveProperty("data");
      expect(auditResponse.data.data).toHaveProperty("action");
      expect(auditResponse.data.data).toHaveProperty("dashboard");

      // Verify action details
      const { action } = auditResponse.data.data;
      expect(action).toHaveProperty("id");
      expect(action).toHaveProperty("type", "DEV_ADMIN_AUDIT_COMPLETED");
      expect(action).toHaveProperty("timestamp");
      expect(action).toHaveProperty("actor", "system");
      expect(action).toHaveProperty("details");
      expect(action.details).toHaveProperty("success");
      expect(action.details).toHaveProperty("timestamp");

      // Verify dashboard details
      const { dashboard } = auditResponse.data.data;
      expect(dashboard).toHaveProperty("auditInfo");
      expect(dashboard.auditInfo).toHaveProperty("success");
      expect(dashboard.auditInfo).toHaveProperty("timestamp");
      expect(dashboard).toHaveProperty("stats");
      expect(dashboard.stats).toHaveProperty("totalTrustAccounts");
      expect(dashboard.stats).toHaveProperty("accountsWithDiscrepancies");

      console.log("\nTrust account audit completed successfully");
    } catch (error: any) {
      if (error.response) {
        console.error("Trust audit failed:", {
          status: error.response.status,
          data: error.response.data
        });
      } else {
        console.error("Trust audit failed:", error.message);
      }
      throw error;
    }
  }, 120000); // 2 minute timeout
});
