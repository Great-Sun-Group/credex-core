import axios from "../../setup";

// Helper function for authenticated requests (JWT only)
export const authRequest = async (
  endpoint: string,
  data: any,
  token?: string
) => {
  const config = {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  };
  console.log("Making request to:", endpoint);
  console.log("With data:", data);
  console.log("And config:", config);
  return axios.post(endpoint, data, config);
};
