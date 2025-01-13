import axios from 'axios';

interface RequestOptions {
  headers?: Record<string, string>;
  [key: string]: any;
}

export const authRequest = async (path: string, data: any, jwt?: string, options: RequestOptions = {}) => {
  const response = await axios({
    ...options,
    method: 'POST',
    url: `${process.env.API_BASE_URL}${path}`,
    data,
    headers: {
      ...(jwt && { Authorization: `Bearer ${jwt}` }),
      ...options.headers
    }
  });

  return {
    status: response.status,
    data: response.data,
    headers: response.headers
  };
};
