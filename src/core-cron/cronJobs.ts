import cron from "node-cron";
import { DailyCredcoinOffering } from "./DCO/DailyCredcoinOffering";
import { MinuteTransactionQueue } from "./MTQ/MinuteTransactionQueue";
import { logError } from "../utils/logger";

export default function startCronJobs() {
  // Running DailyCredcoinOffering every day at midnight UTC
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        await DailyCredcoinOffering();
      } catch (error) {
        logError("Error running DailyCredcoinOffering", error as Error);
      }
    },
    {
      timezone: "UTC",
    }
  );

  // Running MinuteTransactionQueue every minute
  cron.schedule("* * * * *", async () => {
    try {
      await MinuteTransactionQueue();
    } catch (error) {
      logError("Error running MinuteTransactionQueue", error as Error);
    }
  });
}
