import { DailyCredcoinOffering } from '../core-cron/DCO/DailyCredcoinOffering';
import logger from '../utils/logger';

/**
 * Triggers the Daily Credcoin Offering (DCO) process and logs the result.
 * @returns {Promise<void>}
 */
export async function triggerDCO(): Promise<void> {
  logger.info('Triggering Daily Credcoin Offering (DCO)');

  try {
    const result = await DailyCredcoinOffering();
    if (result.success) {
      logger.info('DCO triggered successfully');
    } else {
      logger.error(`DCO trigger failed: ${result.error}`);
    }
  } catch (error) {
    logger.error('Error while triggering DCO', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

// Execute the triggerDCO function if this script is run directly
if (require.main === module) {
  triggerDCO().then(() => {
    logger.info('DCO trigger script completed');
    process.exit(0);
  }).catch((error) => {
    logger.error('DCO trigger script failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  });
}