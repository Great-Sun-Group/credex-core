import cron from "node-cron";
import { DailyCredcoinOffering } from "./DCO/DailyCredcoinOffering";
import { MinuteTransactionQueue } from "./MTQ/MinuteTransactionQueue";
import logger from "../../config/logger";

export default function startCronJobs() {
  logger.info("Starting cron jobs");

  // Running DailyCredcoinOffering every day at midnight UTC
  cron.schedule(
    "0 0 * * *",
    async () => {
      logger.debug("Starting DailyCredcoinOffering job");
      try {
        await DailyCredcoinOffering();
        logger.debug("DailyCredcoinOffering job completed successfully");
      } catch (error) {
        logger.error("Error running DailyCredcoinOffering", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    },
    {
      timezone: "UTC",
    }
  );

  // Running MinuteTransactionQueue every minute
  cron.schedule("* * * * *", async () => {
    logger.debug("Starting MinuteTransactionQueue job");
    try {
      await MinuteTransactionQueue();
      logger.debug("MinuteTransactionQueue job completed successfully");
    } catch (error) {
      logger.error("Error running MinuteTransactionQueue", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  });

  logger.info("Cron jobs started successfully");
}
