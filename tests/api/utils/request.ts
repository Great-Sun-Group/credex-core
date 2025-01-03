import axios, { AxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.API_ENV === 'dev' 
  ? 'https://dev.mycredex.dev'
  : process.env.API_ENV === 'stage'
    ? 'https://stage.mycredex.dev'
    : 'http://localhost:3000';

/**
 * Make an authenticated request to the API
 */
export async function authRequest(
  endpoint: string,
  data: any = {},
  jwt?: string,
  config: AxiosRequestConfig = {}
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(jwt && { Authorization: `Bearer ${jwt}` }),
    ...(process.env.SKIP_RATE_LIMITER_KEY && {
      'x-skip-rate-limit': process.env.SKIP_RATE_LIMITER_KEY
    })
  };

  return axios({
    method: 'POST',
    url: `${API_BASE_URL}${endpoint}`,
    data,
    headers,
    ...config
  });
}
