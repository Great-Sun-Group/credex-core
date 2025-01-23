import axios from "../../setup";

export async function login(phone: string) {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  console.log("\nLogging in member...");
  const response = await axios.post(
    "/login",
    {
      phone: phone,
    },
    { headers }
  );

  console.log("Login response:", JSON.stringify(response.data, null, 2));
  return response.data;
}
