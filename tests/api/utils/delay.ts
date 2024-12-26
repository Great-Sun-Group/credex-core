// Add larger delay between requests to stay under rate limit
export const DELAY_MS = 1000; // Increased to 1 second for heavy operations

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
