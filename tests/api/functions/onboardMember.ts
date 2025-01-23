import axios from "../../setup";

export async function onboardMember(firstname: string, lastname: string, phone: string, defaultDenom: string = "USD") {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  console.log("\nOnboarding member...");
  const response = await axios.post("/onboardMember", {
    firstname,
    lastname,
    phone,
    defaultDenom
  }, { headers });

  console.log("Onboard member response:", JSON.stringify(response.data, null, 2));
  return response.data;
}
