"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.credspan = void 0;
exports.checkDueDate = checkDueDate;
const neo4j_1 = require("../../../config/neo4j");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
exports.credspan = 35;
async function checkDueDate(dueDate) {
    const dueDateMoment = moment_timezone_1.default.utc(dueDate, "YYYY-MM-DD", true);
    if (!dueDateMoment.isValid()) {
        console.error("Due date not in valid format");
        return false;
    }
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    const currentDateQuery = await ledgerSpaceSession.run(`
      MATCH (daynode:Daynode {Active: TRUE})
      RETURN daynode.Date AS today
    `);
    const today = currentDateQuery.records[0].get("today");
    if (!today) {
        console.log("could not get date from daynode");
        return false;
    }
    const lastPermittedDayMoment = (0, moment_timezone_1.default)(today)
        .subtract(1, "months") // because of diff date formats
        .add(exports.credspan, "days");
    const firstPermittedDayMoment = (0, moment_timezone_1.default)(today)
        .subtract(1, "months") // because of diff date formats
        .add(7, "days");
    if (dueDateMoment >= lastPermittedDayMoment ||
        dueDateMoment < firstPermittedDayMoment) {
        console.error("Due date is not within permitted credspan");
        return false;
    }
    return true;
}
//# sourceMappingURL=credspan.js.map