import axios from "../../setup";

export async function deleteAccountInternal(
  token: string,
  accountID: string
) {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY,
    "Authorization": `Bearer ${token}`
  };

  console.log(`\nDeleting internal account with ID "${accountID}"...`);
  const response = await axios.post(
    "/deleteAccountInternal",
    {
      accountID
    },
    { headers }
  );

  console.log("deleteAccountInternal response:", JSON.stringify(response.data, null, 2));
  return response.data;
}
