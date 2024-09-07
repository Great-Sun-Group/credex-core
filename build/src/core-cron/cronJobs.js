"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = startCronJobs;
const node_cron_1 = __importDefault(require("node-cron"));
const DailyCredcoinOffering_1 = require("./DCO/DailyCredcoinOffering");
const MinuteTransactionQueue_1 = require("./MTQ/MinuteTransactionQueue");
function startCronJobs() {
    // Running DailyCredcoinOffering every day at midnight UTC
    node_cron_1.default.schedule("0 0 * * *", async () => {
        try {
            await (0, DailyCredcoinOffering_1.DailyCredcoinOffering)();
        }
        catch (error) {
            console.error("Error running DailyCredcoinOffering:", error);
        }
    }, {
        timezone: "UTC",
    });
    // Running MinuteTransactionQueue every minute
    node_cron_1.default.schedule("* * * * *", async () => {
        try {
            await (0, MinuteTransactionQueue_1.MinuteTransactionQueue)();
        }
        catch (error) {
            console.error("Error running MinuteTransactionQueue:", error);
        }
    });
}
//# sourceMappingURL=cronJobs.js.map