"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBinitialization = DBinitialization;
const neo4j_1 = require("../../../config/neo4j");
const denominations_1 = require("../constants/denominations");
const onboardMember_1 = require("../../api/Member/controllers/onboardMember");
const updateMemberTier_1 = require("../../api/Member/controllers/updateMemberTier");
const CreateAccount_1 = require("../../api/Account/services/CreateAccount");
const OfferCredex_1 = require("../../api/Credex/services/OfferCredex");
const AcceptCredex_1 = require("../../api/Credex/services/AcceptCredex");
const fetchZigRate_1 = require("./fetchZigRate");
const axios_1 = __importDefault(require("axios"));
const lodash_1 = __importDefault(require("lodash"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const logger_1 = __importDefault(require("../../../config/logger"));
/**
 * Initializes the database for the Daily Credcoin Offering (DCO) process.
 * This function sets up necessary constraints, creates initial accounts,
 * and establishes the starting state for the DCO.
 */
async function DBinitialization() {
    console.log("Starting DBinitialization");
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    const searchSpaceSession = neo4j_1.searchSpaceDriver.session();
    try {
        await setupDatabaseConstraints(ledgerSpaceSession, searchSpaceSession);
        const dayZero = establishDayZero();
        const dayZeroCXXrates = await fetchAndProcessRates(dayZero);
        await createDayZeroDaynode(ledgerSpaceSession, dayZero, dayZeroCXXrates);
        await createInitialAccounts(ledgerSpaceSession);
    }
    catch (error) {
        logger_1.default.error("Error during DBinitialization", error);
        throw error;
    }
    finally {
        await ledgerSpaceSession.close();
        await searchSpaceSession.close();
    }
}
/**
 * Sets up necessary database constraints and indexes.
 */
async function setupDatabaseConstraints(ledgerSpaceSession, searchSpaceSession) {
    console.log("Creating database constraints and indexes...");
    // Remove any current db constraints
    await ledgerSpaceSession.run("CALL apoc.schema.assert({}, {})");
    await searchSpaceSession.run("CALL apoc.schema.assert({}, {})");
    // Set new constraints
    const constraints = [
        "CREATE CONSTRAINT daynodeDate_unique IF NOT EXISTS FOR (daynode:Daynode) REQUIRE daynode.Date IS UNIQUE",
        "CREATE CONSTRAINT memberID_unique IF NOT EXISTS FOR (member:Member) REQUIRE member.memberID IS UNIQUE",
        "CREATE CONSTRAINT memberHandle_unique IF NOT EXISTS FOR (member:Member) REQUIRE member.memberHandle IS UNIQUE",
        "CREATE CONSTRAINT memberPhone_unique IF NOT EXISTS FOR (member:Member) REQUIRE member.phone IS UNIQUE",
        "CREATE CONSTRAINT accountID_unique IF NOT EXISTS FOR (account:Account) REQUIRE account.accountID IS UNIQUE",
        "CREATE CONSTRAINT accountHandle_unique IF NOT EXISTS FOR (account:Account) REQUIRE account.accountHandle IS UNIQUE",
    ];
    for (const constraint of constraints) {
        await ledgerSpaceSession.run(constraint);
    }
    await searchSpaceSession.run("CREATE CONSTRAINT accountID_unique IF NOT EXISTS FOR (account:Account) REQUIRE account.accountID IS UNIQUE");
    await searchSpaceSession.run("CREATE CONSTRAINT credexID_unique IF NOT EXISTS FOR (credex:Credex) REQUIRE credex.credexID IS UNIQUE");
}
/**
 * Establishes the day zero date.
 */
function establishDayZero() {
    console.log("Establishing day zero");
    const dayZero = process.env.DEPLOYMENT === "dev"
        ? "2021-01-01"
        : moment_timezone_1.default.utc().subtract(1, "days").format("YYYY-MM-DD");
    console.log("Day zero:", dayZero);
    return dayZero;
}
/**
 * Fetches and processes currency rates for day zero.
 */
async function fetchAndProcessRates(dayZero) {
    console.log("Loading currencies and current rates...");
    const symbols = (0, denominations_1.getDenominations)({
        sourceForRate: "OpenExchangeRates",
        formatAsList: true,
    });
    const baseUrl = `https://openexchangerates.org/api/historical/${dayZero}.json?app_id=${process.env.OPEN_EXCHANGE_RATES_API}&symbols=${symbols}`;
    const { data: { rates: USDbaseRates }, } = await axios_1.default.get(baseUrl);
    USDbaseRates.ZIG = (await (0, fetchZigRate_1.fetchZigRate)())[1].avg;
    const OneCXXinCXXdenom = 1;
    const CXXdenom = "CAD";
    console.log(OneCXXinCXXdenom + " CXX = 1 " + CXXdenom);
    const XAUbaseRates = lodash_1.default.mapValues(USDbaseRates, (value) => value / USDbaseRates.XAU);
    const dayZeroCXXrates = lodash_1.default.mapValues(XAUbaseRates, (value) => (1 / value) * OneCXXinCXXdenom * XAUbaseRates[CXXdenom]);
    dayZeroCXXrates.CXX = 1;
    console.log("Day zero CXX rates:", dayZeroCXXrates);
    return dayZeroCXXrates;
}
/**
 * Creates the day zero daynode in the database.
 */
async function createDayZeroDaynode(session, dayZero, dayZeroCXXrates) {
    console.log("Creating day zero daynode...");
    await session.run(`
    CREATE (daynode:Daynode)
    SET daynode = $dayZeroCXXrates,
        daynode.Date = date($dayZero),
        daynode.Active = TRUE,
        daynode.DCOrunningNow = TRUE
  `, { dayZeroCXXrates, dayZero });
}
/**
 * Creates initial accounts and relationships for the DCO process.
 */
async function createInitialAccounts(session) {
    console.log("Creating initialization accounts and relationships...");
    const rdubs = await createRdubsAccount();
    const credexFoundationID = await createCredexFoundation(rdubs.onboardedMemberID);
    const greatSunID = await createGreatSun(rdubs.onboardedMemberID);
    const vimbisoPayID = await createVimbisoPay(rdubs.onboardedMemberID);
    await createInitialRelationships(session, credexFoundationID, greatSunID, vimbisoPayID);
    await createInitialCredex(rdubs.onboardedMemberID, greatSunID, rdubs.personalAccountID);
}
async function createRdubsAccount() {
    const result = await (0, onboardMember_1.OnboardMemberController)("Ryan", "Watson", "263778177125");
    if ("error" in result) {
        throw new Error(`Failed to create rdubs account: ${result.error}`);
    }
    const onboardedMemberID = result.memberDashboard.memberID;
    const updateTierResult = await (0, updateMemberTier_1.UpdateMemberTierController)(onboardedMemberID, 5);
    if (!updateTierResult.success) {
        throw new Error(`Failed to update member tier: ${updateTierResult.message}`);
    }
    const rdubsPersonalAccount = await (0, CreateAccount_1.CreateAccountService)(onboardedMemberID, "PERSONAL_CONSUMPTION", "Ryan Watson Personal", "263778177125", "USD", 1, "CAD");
    return {
        onboardedMemberID,
        personalAccountID: rdubsPersonalAccount.accountID,
    };
}
async function createCredexFoundation(memberID) {
    const credexFoundation = await (0, CreateAccount_1.CreateAccountService)(memberID, "CREDEX_FOUNDATION", "Credex Foundation", "credexfoundation", "CXX");
    if (typeof credexFoundation.account === "boolean" ||
        !credexFoundation.accountID) {
        throw new Error("Failed to create Credex Foundation account");
    }
    return credexFoundation.accountID;
}
async function createGreatSun(memberID) {
    const greatSun = await (0, CreateAccount_1.CreateAccountService)(memberID, "BUSINESS", "Great Sun Financial", "greatsunfinancial", "CAD");
    if (!greatSun || !greatSun.accountID) {
        throw new Error("Failed to create Great Sun account");
    }
    return greatSun.accountID;
}
async function createVimbisoPay(memberID) {
    const vimbisoPay = await (0, CreateAccount_1.CreateAccountService)(memberID, "BUSINESS", "VimbisoPay", "vimbisopay.audited", "CAD");
    if (!vimbisoPay || !vimbisoPay.accountID) {
        throw new Error("Failed to create VimbisoPay account");
    }
    return vimbisoPay.accountID;
}
async function createInitialRelationships(session, credexFoundationID, greatSunID, vimbisoPayID) {
    await session.run(`
    MATCH (credexFoundation: Account { accountID: $credexFoundationID })
    MATCH (greatSun: Account { accountID: $greatSunID })
    MATCH (vimbisoPay: Account { accountID: $vimbisoPayID })
    MERGE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (credexFoundation)
    MERGE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (greatSun)
    MERGE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (vimbisoPay)
  `, { credexFoundationID, greatSunID, vimbisoPayID });
}
async function createInitialCredex(memberID, issuerAccountID, receiverAccountID) {
    const credexData = {
        memberID,
        issuerAccountID,
        receiverAccountID,
        Denomination: "CAD",
        InitialAmount: 365, // fund DCO for a year with no adjustments
        credexType: "PURCHASE",
        securedCredex: true,
    };
    const DCOinitializationOfferCredex = await (0, OfferCredex_1.OfferCredexService)(credexData);
    if (typeof DCOinitializationOfferCredex.credex === "boolean") {
        throw new Error("Invalid response from OfferCredexService");
    }
    if (DCOinitializationOfferCredex.credex &&
        typeof DCOinitializationOfferCredex.credex.credexID === "string") {
        await (0, AcceptCredex_1.AcceptCredexService)(DCOinitializationOfferCredex.credex.credexID, memberID);
    }
    else {
        throw new Error("Invalid credexID from OfferCredexService");
    }
}
//# sourceMappingURL=DBinitialization.js.map