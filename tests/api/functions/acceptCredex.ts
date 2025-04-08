import axios from "../../setup";

export async function acceptCredex(token: string, credexID: string) {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  console.log("\nAccepting credex...");
  const response = await axios.post(
    "/acceptCredex",
    {
      credexID,
    },
    {
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
      },
    }
  );

  console.log(
    "Accept credex response:",
    JSON.stringify(response.data, null, 2)
  );
  return response.data;
}
