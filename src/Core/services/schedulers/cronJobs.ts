const cron = require('node-cron')
import { DailyCredcoinOffering } from "../DailyCredcoinOffering"
import { MinuteTransactionQueue } from "../MinuteTransactionQueue";


export default function startCronJobs() {
  
  // Running DailyCredcoinOffering every day at midnight UTC
  cron.schedule('0 0 * * *', async () => {
    try {
      await DailyCredcoinOffering();
    } catch (error) {
      console.error('Error running DailyCredcoinOffering:', error);
    }
  }, {
    timezone: 'UTC'
  });

  // Running MinuteTransactionQueue every minute
  cron.schedule('* * * * *', async () => {
    try {
      await MinuteTransactionQueue();
    } catch (error) {
      console.error('Error running MinuteTransactionQueue:', error);
    }
  });
}
