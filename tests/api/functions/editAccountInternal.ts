import axios from "../../setup";

export async function editAccountInternal(
  token: string,
  accountID: string,
  accountName: string,
  defaultDenom: string = "USD"
) {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY,
    "Authorization": `Bearer ${token}`
  };

  console.log(`\nUpdating internal account "${accountName}"...`);
  const response = await axios.post(
    "/editAccountInternal",
    {
      accountID,
      accountName,
      defaultDenom
    },
    { headers }
  );

  console.log("editAccountInternal response:", JSON.stringify(response.data, null, 2));
  return response.data;
}
