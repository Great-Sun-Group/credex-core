const validateApiKey = (apiKey: string): boolean => {
  const validApiKey = process.env.CREDEX_API_CREDENTIALS;
  
  return apiKey === validApiKey;
};

export default validateApiKey;
