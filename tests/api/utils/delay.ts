// Helper function to add delay between requests
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Default delay between requests
export const DELAY_MS = 1000;
