import axios from "../../setup";

export async function disconnectAsset(
  token: string,
  assetID: string,
  connectedID: string,
  relName: string
) {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY,
    "Authorization": `Bearer ${token}`
  };

  console.log(`\nDisconnecting asset "${assetID}" from "${connectedID}" with relationship "${relName}"...`);
  const response = await axios.post(
    "/disconnectAsset",
    {
      assetID,
      connectedID,
      relName
    },
    { headers }
  );

  console.log("disconnectAsset response:", JSON.stringify(response.data, null, 2));
  return response.data;
}
