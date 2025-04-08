import axios from "../setup";

describe("generateInvoice Test", () => {
  it("generates an invoice for a transaction", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, paymentAccountID, itemName, quantity, unit, price, currency, notes] = params;

    if (!token || !paymentAccountID || !itemName || !quantity || !unit || !price) {
      throw new Error(
        "Usage: npm test generateInvoice <token> <paymentAccountID> <itemName> <quantity> <unit> <price> [currency] [notes]"
      );
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      "Authorization": `Bearer ${token}`
    };

    // Calculate total
    const itemPrice = parseFloat(price);
    const itemQuantity = parseFloat(quantity);
    const total = itemPrice * itemQuantity;

    // Create item object
    const item = {
      name: itemName,
      quantity: itemQuantity,
      unit,
      price: itemPrice,
      total
    };

    console.log("\nGenerating invoice...");
    const response = await axios.post(
      "/generateInvoice",
      {
        paymentAccountID,
        AssetMarkerData: {
          items: [item],
          total,
          currency: currency || "USD",
          ...(notes && { notes })
        }
      },
      { headers }
    );

    console.log(
      "generateInvoice response:",
      JSON.stringify(response.data, null, 2)
    );
    
    expect(response.status).toBe(201);
    expect(response.data.data.action.type).toBe("INVOICE_GENERATED");
    
    // Print important information for the next step
    console.log("\n=== DATA FOR NEXT STEP ===");
    console.log(`Token: ${token}`);
    console.log(`Invoice ID: ${response.data.data.action.details.invoiceID}`);
    console.log(`Invoice QR Link: ${response.data.data.action.details.invoiceQRLink}`);
    console.log(`Amount: ${response.data.data.action.details.amount} ${response.data.data.action.details.denomination}`);
    console.log(`Payment Account ID: ${paymentAccountID}`);
    console.log("=========================\n");
  });
});
