const validateApiKey = (apiKey: string): boolean => {
  const validApiKey = process.env.CREDEX_API_CREDENTIALS;

  if (!validApiKey) {
    console.error('CREDEX_API_CREDENTIALS is not defined in environment variables');
    return false;
  }

  const isValid = apiKey === validApiKey;

  if (!isValid) {
    console.warn('Invalid API key attempt');
  }

  return isValid;
};

export default validateApiKey;
