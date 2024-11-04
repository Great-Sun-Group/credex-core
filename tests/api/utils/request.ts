import axios from "../../setup";

// Helper function for authenticated requests
export const authRequest = async (endpoint: string, data: any, token?: string) => {
  const config = token
    ? {
        headers: { Authorization: `Bearer ${token}` },
      }
    : {};
  return axios.post(endpoint, data, config);
};
