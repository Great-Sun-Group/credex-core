/**
 * Default delay between API requests to prevent rate limiting
 */
export const DELAY_MS = 1000;

/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Delay with custom duration based on environment
 */
export function getDelayDuration(baseDelay: number = DELAY_MS): number {
  // Add extra delay for deployed environments
  if (process.env.API_ENV === 'dev' || process.env.API_ENV === 'stage') {
    return baseDelay * 1.5;
  }
  return baseDelay;
}

/**
 * Delay with environment-specific duration
 */
export async function delayForEnvironment(baseDelay: number = DELAY_MS): Promise<void> {
  const duration = getDelayDuration(baseDelay);
  await delay(duration);
}
