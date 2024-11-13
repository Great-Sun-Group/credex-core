// Add larger delay between requests to stay under rate limit
export const DELAY_MS = 100;

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
