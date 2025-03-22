import axios from "../setup";

describe("createCredexWithInvoice Test", () => {
  it("creates a credex that executes an invoice", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, issuerAccountID, receiverAccountID, denomination, initialAmount, credexType, offersOrRequests, secured, invoiceID, dueDate] = params;

    if (!token || !issuerAccountID || !receiverAccountID || !denomination || !initialAmount || !credexType || !offersOrRequests || !secured || !invoiceID) {
      throw new Error(
        "Usage: npm test createCredexWithInvoice <token> <issuerAccountID> <receiverAccountID> <denomination> <initialAmount> <credexType> <offersOrRequests> <secured> <invoiceID> [dueDate]"
      );
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      "Authorization": `Bearer ${token}`
    };

    // Convert secured string to boolean
    const securedBool = secured.toLowerCase() === "true";
    
    // Build request body
    const requestBody: any = {
      issuerAccountID,
      receiverAccountID,
      Denomination: denomination,
      InitialAmount: parseFloat(initialAmount),
      credexType,
      OFFERSorREQUESTS: offersOrRequests,
      securedCredex: securedBool,
      invoiceID
    };
    
    // Add dueDate if provided (for unsecured credex)
    if (!securedBool && dueDate) {
      requestBody.dueDate = dueDate;
    }

    console.log("\nCreating credex with invoice...");
    const response = await axios.post(
      "/createCredex",
      requestBody,
      { headers }
    );

    console.log(
      "createCredexWithInvoice response:",
      JSON.stringify(response.data, null, 2)
    );
    
    expect(response.status).toBe(201);
    expect(response.data.data.action.type).toBe("CREDEX_CREATED");
    expect(response.data.data.action.details.invoiceID).toBe(invoiceID);
    
    // Print important information for the next step
    console.log("\n=== DATA FOR NEXT STEP ===");
    console.log(`Token: ${token}`);
    console.log(`Credex ID: ${response.data.data.action.id}`);
    console.log(`Invoice ID: ${invoiceID}`);
    console.log(`Amount: ${initialAmount} ${denomination}`);
    console.log(`GLid: ${response.data.data.action.details.GLid}`);
    console.log("=========================\n");
  });
});
