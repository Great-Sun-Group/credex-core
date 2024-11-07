import logger from '../../../utils/logger';
import { AdminError, ErrorCodes } from '../../../utils/errorUtils';
import { DailyCredcoinOffering } from '../../../core-cron/DCO/DailyCredcoinOffering';

export async function ForceDCOService(): Promise<void> {
  try {
    logger.info('Starting forced Daily Credcoin Offering');
    
    await DailyCredcoinOffering();
    
    logger.info('Daily Credcoin Offering completed successfully');
  } catch (error) {
    logger.error('Error during forced Daily Credcoin Offering', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof AdminError) {
      throw error;
    }
    
    throw new AdminError(
      'Failed to force Daily Credcoin Offering', 
      'INTERNAL_ERROR', 
      ErrorCodes.Admin.INTERNAL_ERROR
    );
  }
}
