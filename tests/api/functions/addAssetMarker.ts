import axios from "../../setup";

export async function addAssetMarker(
  token: string,
  assetName: string,
  crAccounts: Array<{accountID: string, amount: number}>,
  drAccounts: Array<{accountID: string, amount: number}>,
  denomination: string = "USD",
  assetMarkerData: any = {}
) {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY,
    "Authorization": `Bearer ${token}`
  };

  console.log(`\nAdding asset marker "${assetName}"...`);
  
  const requestBody = {
    assetName,
    crAccounts,
    drAccounts,
    denomination,
    ...assetMarkerData
  };

  const response = await axios.post(
    "/addAssetMarker",
    requestBody,
    { headers }
  );

  console.log("addAssetMarker response:", JSON.stringify(response.data, null, 2));
  return response.data;
}
