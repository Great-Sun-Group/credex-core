import axios from "../../setup";

// Helper function for authenticated requests
export const authRequest = async (endpoint: string, data: any, token?: string) => {
  const config = token
    ? {
        headers: { Authorization: `Bearer ${token}` },
      }
    : {};
  console.log("Making request to:", endpoint);
  console.log("With data:", data);
  console.log("And config:", config);
  return axios.post(endpoint, data, config);
};
