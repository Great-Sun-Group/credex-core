import axios from "../../setup";

export async function generateInvoice(
  token: string,
  paymentAccountID: string,
  items: Array<{
    name: string,
    quantity: number,
    unit: string,
    price: number,
    total: number
  }>,
  total: number,
  currency: string = "USD",
  notes?: string
) {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY,
    "Authorization": `Bearer ${token}`
  };

  console.log(`\nGenerating invoice for ${currency} ${total}...`);
  
  const assetMarkerData = {
    items,
    total,
    currency,
    ...(notes && { notes })
  };

  const response = await axios.post(
    "/generateInvoice",
    {
      paymentAccountID,
      AssetMarkerData: assetMarkerData
    },
    { headers }
  );

  console.log("generateInvoice response:", JSON.stringify(response.data, null, 2));
  return response.data;
}
