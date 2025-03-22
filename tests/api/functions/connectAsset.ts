import axios from "../../setup";

export async function connectAsset(
  token: string,
  assetID: string,
  connectedID: string,
  relName: string
) {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY,
    "Authorization": `Bearer ${token}`
  };

  console.log(`\nConnecting asset "${assetID}" to "${connectedID}" with relationship "${relName}"...`);
  const response = await axios.post(
    "/connectAsset",
    {
      assetID,
      connectedID,
      relName
    },
    { headers }
  );

  console.log("connectAsset response:", JSON.stringify(response.data, null, 2));
  return response.data;
}
