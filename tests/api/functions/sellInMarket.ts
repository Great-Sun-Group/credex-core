import axios from "../../setup";

export async function sellInMarket(token: string, vendor: boolean = true) {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY,
    "Authorization": `Bearer ${token}`
  };

  console.log(`\nEnabling vendor functionality (vendor=${vendor})...`);
  const response = await axios.post(
    "sellInMarket", // Remove the leading slash to match onboardMember
    { vendor },
    { headers }
  );

  console.log("sellInMarket response:", JSON.stringify(response.data, null, 2));
  return response.data;
}
