import axios from "../../setup";

export async function loginV2(phone: string, password: string) {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  console.log("\nLogging in member with v2...");
  const response = await axios.post(
    "/v2/login",
    {
      phone,
      password,
    },
    { headers }
  );

  console.log("Login v2 response:", JSON.stringify(response.data, null, 2));
  return response.data;
}
