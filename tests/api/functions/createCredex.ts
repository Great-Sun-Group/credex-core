import axios from "../../setup";

export async function createCredex(
  token: string,
  issuerAccountID: string,
  receiverAccountID: string,
  denomination: string,
  initialAmount: number,
  credexType: string,
  offersOrRequests: string,
  secured: boolean
) {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  console.log("\nCreating credex...");
  const response = await axios.post(
    "/createCredex",
    {
      issuerAccountID,
      receiverAccountID,
      Denomination: denomination,
      InitialAmount: initialAmount,
      credexType,
      OFFERSorREQUESTS: offersOrRequests,
      securedCredex: secured,
    },
    {
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
      },
    }
  );

  console.log(
    "Create credex response:",
    JSON.stringify(response.data, null, 2)
  );
  return response.data;
}
