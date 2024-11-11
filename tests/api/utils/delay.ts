// Helper function to add delay between requests
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Default delay between requests (5 seconds to stay well under rate limit)
export const DELAY_MS = 5000;
