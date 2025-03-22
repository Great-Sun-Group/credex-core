import { onboardMember } from "./functions/onboardMember";
import { sellInMarket } from "./functions/sellInMarket";
import { editMember } from "./functions/editMember";
import { createAccountInternal } from "./functions/createAccountInternal";
import { addAssetMarker } from "./functions/addAssetMarker";
import { uploadAndOptimizeJpg } from "./functions/uploadAndOptimizeJpg";
import { connectAsset } from "./functions/connectAsset";
import { generateInvoice } from "./functions/generateInvoice";
import { createCredexWithInvoice } from "./functions/createCredexWithInvoice";
import fs from "fs";
import path from "path";

describe("Vimbiso Market Flow", () => {
  it("completes the full market flow", async () => {
    // Step 1: Create test vendor
    console.log("\n--- Step 1: Create test vendor ---");
    const timestamp = Date.now();
    const vendorResponse = await onboardMember(
      "Test",
      "Vendor",
      `${timestamp}`,
      "USD"
    );
    
    const vendorToken = vendorResponse.data.action.details.token;
    const vendorID = vendorResponse.data.action.details.memberID;
    const vendorAccountID = vendorResponse.data.action.details.defaultAccountID;
    
    console.log("Created test vendor with ID:", vendorID);
    
    // Step 2: Enable vendor functionality
    console.log("\n--- Step 2: Enable vendor functionality ---");
    const sellInMarketResponse = await sellInMarket(vendorToken, true);
    
    // Step 3: Update vendor profile
    console.log("\n--- Step 3: Update vendor profile ---");
    const editMemberResponse = await editMember(
      vendorToken,
      undefined,
      undefined,
      "TESTVENDOR",
      "I sell fresh produce in the Vimbiso Market."
    );
    
    // Step 4: Create product account
    console.log("\n--- Step 4: Create product account ---");
    const productAccountResponse = await createAccountInternal(
      vendorToken,
      "Fresh Tomatoes",
      "USD",
      "PRODUCTION"
    );
    
    const productAccountID = productAccountResponse.data.action.details.accountID;
    
    // Step 5: Create production account
    console.log("\n--- Step 5: Create production account ---");
    const productionAccountResponse = await createAccountInternal(
      vendorToken,
      "Tomato Production",
      "USD",
      "PRODUCTION"
    );
    
    const productionAccountID = productionAccountResponse.data.action.details.accountID;
    
    // Step 6: Add initial inventory
    console.log("\n--- Step 6: Add initial inventory ---");
    const initialInventoryResponse = await addAssetMarker(
      vendorToken,
      "Initial Tomato Inventory",
      productionAccountID,
      100,
      productAccountID,
      100,
      "USD",
      {
        description: "Initial inventory of fresh tomatoes",
        quantity: "100 kg"
      }
    );
    
    // Step 7: Upload product image (if test image exists)
    let originalAssetID;
    let asset200pxID;
    let asset600pxID;
    
    const testImagePath = path.join(__dirname, '../../assets/original-images/market1.png');
    if (fs.existsSync(testImagePath)) {
      console.log("\n--- Step 7: Upload product image ---");
      const uploadImageResponse = await uploadAndOptimizeJpg(
        vendorToken,
        testImagePath,
        "tomato_product_image",
        productAccountID
      );
      
      originalAssetID = uploadImageResponse.data.action.details.originalAssetID;
      asset200pxID = uploadImageResponse.data.action.details.asset200pxID;
      asset600pxID = uploadImageResponse.data.action.details.asset600pxID;
      
      // Step 8: Connect product image to account
      console.log("\n--- Step 8: Connect product image to account ---");
      await connectAsset(
        vendorToken,
        asset200pxID,
        productAccountID,
        "ACCOUNT_PIC_200_JPG"
      );
    } else {
      console.log("\n--- Skipping image upload (test image not found) ---");
    }
    
    // Step 9: Create test customer
    console.log("\n--- Step 9: Create test customer ---");
    const customerResponse = await onboardMember(
      "Test",
      "Customer",
      `${timestamp + 1}`,
      "USD"
    );
    
    const customerToken = customerResponse.data.action.details.token;
    const customerID = customerResponse.data.action.details.memberID;
    const customerAccountID = customerResponse.data.action.details.defaultAccountID;
    
    console.log("Created test customer with ID:", customerID);
    
    // Step 10: Generate invoice
    console.log("\n--- Step 10: Generate invoice ---");
    const invoiceResponse = await generateInvoice(
      vendorToken,
      productAccountID,
      [
        {
          name: "Fresh Tomatoes",
          quantity: 5,
          unit: "kg",
          price: 4.00,
          total: 20.00
        }
      ],
      20.00,
      "USD",
      "Farm fresh tomatoes"
    );
    
    const invoiceID = invoiceResponse.data.action.details.invoiceID;
    
    // Step 11: Create credex that executes the invoice
    console.log("\n--- Step 11: Create credex that executes the invoice ---");
    const credexResponse = await createCredexWithInvoice(
      customerToken,
      customerAccountID,
      productAccountID,
      "USD",
      20.00,
      "PAYMENT",
      "OFFERS",
      true,
      invoiceID
    );
    
    const credexID = credexResponse.data.action.id;
    const GLid = credexResponse.data.action.details.GLid;
    
    // Final verification
    console.log("\n--- Market Flow Test Completed Successfully ---");
    console.log("Vendor ID:", vendorID);
    console.log("Customer ID:", customerID);
    console.log("Product Account ID:", productAccountID);
    console.log("Invoice ID:", invoiceID);
    console.log("Credex ID:", credexID);
    console.log("GLid:", GLid);
    
    expect(credexResponse.data.action.type).toBe("CREDEX_CREATED");
    expect(credexResponse.data.action.details.invoiceID).toBe(invoiceID);
  }, 60000); // 60 second timeout
});
