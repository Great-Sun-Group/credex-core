import axios from "../../setup";

export async function createAccountInternal(
  token: string,
  accountName: string,
  defaultDenom: string = "USD",
  accountType: string = "PRODUCTION"
) {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY,
    "Authorization": `Bearer ${token}`
  };

  console.log(`\nCreating internal account "${accountName}"...`);
  const response = await axios.post(
    "/createAccountInternal",
    {
      accountName,
      defaultDenom,
      accountType
    },
    { headers }
  );

  console.log("createAccountInternal response:", JSON.stringify(response.data, null, 2));
  return response.data;
}
