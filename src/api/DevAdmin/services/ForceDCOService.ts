import logger from '../../../utils/logger';
import { DailyCredcoinOffering } from '../../../core-cron/DCO/DailyCredcoinOffering';

export const ForceDCOService = async (): Promise<void> => {
  try {
    logger.info('Forcing Daily Credcoin Offering');
    await DailyCredcoinOffering();
    logger.info('Daily Credcoin Offering completed successfully');
  } catch (error) {
    logger.error('Error during forced Daily Credcoin Offering', { error });
    throw error;
  }
};