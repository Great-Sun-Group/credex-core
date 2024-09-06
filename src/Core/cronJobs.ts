import cron from "node-cron";
import { DailyCredcoinOffering } from "./DCO/DailyCredcoinOffering";
import { MinuteTransactionQueue } from "./MTQ/MinuteTransactionQueue";

export default function startCronJobs() {
  // Running DailyCredcoinOffering every day at midnight UTC
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        await DailyCredcoinOffering();
      } catch (error) {
        console.error("Error running DailyCredcoinOffering:", error);
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
      console.error("Error running MinuteTransactionQueue:", error);
    }
  });
}
