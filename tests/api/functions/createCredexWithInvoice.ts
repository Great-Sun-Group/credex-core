import axios from "../../setup";

export async function createCredexWithInvoice(
  token: string,
  issuerAccountID: string,
  receiverAccountID: string,
  denomination: string,
  initialAmount: number,
  credexType: string,
  offersOrRequests: string,
  secured: boolean,
  invoiceID: string,
  dueDate?: string
) {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  console.log("\nCreating credex with invoice...");
  
  const requestBody: any = {
    issuerAccountID,
    receiverAccountID,
    Denomination: denomination,
    InitialAmount: initialAmount,
    credexType,
    OFFERSorREQUESTS: offersOrRequests,
    securedCredex: secured,
    invoiceID
  };
  
  // Add dueDate if provided (for unsecured credex)
  if (!secured && dueDate) {
    requestBody.dueDate = dueDate;
  }

  const response = await axios.post(
    "/createCredex",
    requestBody,
    {
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
      },
    }
  );

  console.log(
    "Create credex with invoice response:",
    JSON.stringify(response.data, null, 2)
  );
  return response.data;
}
