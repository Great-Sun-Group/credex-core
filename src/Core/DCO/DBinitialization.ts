import { ledgerSpaceDriver, searchSpaceDriver } from "../../../config/neo4j";
import { getDenominations } from "../constants/denominations";
import { OnboardMemberService } from "../../Member/services/OnboardMember";
import { UpdateMemberTierService } from "../../Member/services/UpdateMemberTier";
import { CreateAccountService } from "../../Account/services/CreateAccount";
import { OfferCredexService } from "../../Credex/services/OfferCredex";
import { AcceptCredexService } from "../../Credex/services/AcceptCredex";
import { fetchZigRate } from "./fetchZigRate";
import axios from "axios";
import _ from "lodash";
import moment from "moment-timezone";
import logger from "../../../config/logger";

/**
 * Initializes the database for the Daily Credcoin Offering (DCO) process.
 * This function sets up necessary constraints, creates initial accounts,
 * and establishes the starting state for the DCO.
 */
export async function DBinitialization(): Promise<void> {
  console.log("Starting DBinitialization");

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  try {
    await setupDatabaseConstraints(ledgerSpaceSession, searchSpaceSession);
    const dayZero = establishDayZero();
    const dayZeroCXXrates = await fetchAndProcessRates(dayZero);
    await createDayZeroDaynode(ledgerSpaceSession, dayZero, dayZeroCXXrates);
    await createInitialAccounts(ledgerSpaceSession);
  } catch (error) {
    logger.error("Error during DBinitialization", error);
    throw error;
  } finally {
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
  }
}

/**
 * Sets up necessary database constraints and indexes.
 */
async function setupDatabaseConstraints(ledgerSpaceSession: any, searchSpaceSession: any): Promise<void> {
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
    "CREATE CONSTRAINT accountHandle_unique IF NOT EXISTS FOR (account:Account) REQUIRE account.accountHandle IS UNIQUE"
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
function establishDayZero(): string {
  console.log("Establishing day zero");
  const dayZero = process.env.DEPLOYMENT === "dev" ? "2021-01-01" : moment.utc().subtract(1, "days").format("YYYY-MM-DD");
  console.log("Day zero:", dayZero);
  return dayZero;
}

/**
 * Fetches and processes currency rates for day zero.
 */
async function fetchAndProcessRates(dayZero: string): Promise<any> {
  console.log("Loading currencies and current rates...");
  const symbols = getDenominations({ sourceForRate: "OpenExchangeRates", formatAsList: true });
  const baseUrl = `https://openexchangerates.org/api/historical/${dayZero}.json?app_id=${process.env.OPEN_EXCHANGE_RATES_API}&symbols=${symbols}`;
  
  const { data: { rates: USDbaseRates } } = await axios.get(baseUrl);
  USDbaseRates.ZIG = (await fetchZigRate())[1].avg;

  const OneCXXinCXXdenom = 1;
  const CXXdenom = "CAD";
  console.log(OneCXXinCXXdenom + " CXX = 1 " + CXXdenom);

  const XAUbaseRates = _.mapValues(USDbaseRates, (value) => value / USDbaseRates.XAU);
  const dayZeroCXXrates = _.mapValues(XAUbaseRates, (value) => (1 / value) * OneCXXinCXXdenom * XAUbaseRates[CXXdenom]);
  dayZeroCXXrates.CXX = 1;

  console.log("Day zero CXX rates:", dayZeroCXXrates);
  return dayZeroCXXrates;
}

/**
 * Creates the day zero daynode in the database.
 */
async function createDayZeroDaynode(session: any, dayZero: string, dayZeroCXXrates: any): Promise<void> {
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
async function createInitialAccounts(session: any): Promise<void> {
  console.log("Creating initialization accounts and relationships...");

  const rdubs = await createRdubsAccount();
  const credexFoundationID = await createCredexFoundation(rdubs.onboardedMemberID);
  const greatSunID = await createGreatSun(rdubs.onboardedMemberID);
  const vimbisoPayID = await createVimbisoPay(rdubs.onboardedMemberID);

  await createInitialRelationships(session, credexFoundationID, greatSunID, vimbisoPayID);
  await createInitialCredex(rdubs.onboardedMemberID, greatSunID, rdubs.personalAccountID);
}

async function createRdubsAccount(): Promise<{ onboardedMemberID: string; personalAccountID: string }> {
  const rdubs = await OnboardMemberService("Ryan", "Watson", "263778177125");
  if (typeof rdubs.onboardedMemberID === "boolean") {
    throw new Error("Failed to create rdubs account");
  }

  await UpdateMemberTierService(rdubs.onboardedMemberID, 5);

  const rdubsPersonalAccount = await CreateAccountService(
    rdubs.onboardedMemberID,
    "PERSONAL_CONSUMPTION",
    "Ryan Watson Personal",
    "263778177125",
    "USD",
    1,
    "CAD"
  );

  return { onboardedMemberID: rdubs.onboardedMemberID, personalAccountID: rdubsPersonalAccount.accountID };
}

async function createCredexFoundation(memberID: string): Promise<string> {
  const credexFoundation = await CreateAccountService(
    memberID,
    "CREDEX_FOUNDATION",
    "Credex Foundation",
    "credexfoundation",
    "CXX"
  );

  if (typeof credexFoundation.account === "boolean" || !credexFoundation.accountID) {
    throw new Error("Failed to create Credex Foundation account");
  }

  return credexFoundation.accountID;
}

async function createGreatSun(memberID: string): Promise<string> {
  const greatSun = await CreateAccountService(
    memberID,
    "BUSINESS",
    "Great Sun Financial",
    "greatsunfinancial",
    "CAD"
  );

  if (!greatSun || !greatSun.accountID) {
    throw new Error("Failed to create Great Sun account");
  }

  return greatSun.accountID;
}

async function createVimbisoPay(memberID: string): Promise<string> {
  const vimbisoPay = await CreateAccountService(
    memberID,
    "BUSINESS",
    "VimbisoPay",
    "vimbisopay.audited",
    "CAD"
  );

  if (!vimbisoPay || !vimbisoPay.accountID) {
    throw new Error("Failed to create VimbisoPay account");
  }

  return vimbisoPay.accountID;
}

async function createInitialRelationships(session: any, credexFoundationID: string, greatSunID: string, vimbisoPayID: string): Promise<void> {
  await session.run(`
    MATCH (credexFoundation: Account { accountID: $credexFoundationID })
    MATCH (greatSun: Account { accountID: $greatSunID })
    MATCH (vimbisoPay: Account { accountID: $vimbisoPayID })
    MERGE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (credexFoundation)
    MERGE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (greatSun)
    MERGE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (vimbisoPay)
  `, { credexFoundationID, greatSunID, vimbisoPayID });
}

async function createInitialCredex(memberID: string, issuerAccountID: string, receiverAccountID: string): Promise<void> {
  const credexData = {
    memberID,
    issuerAccountID,
    receiverAccountID,
    Denomination: "CAD",
    InitialAmount: 365, // fund DCO for a year with no adjustments
    credexType: "PURCHASE",
    securedCredex: true,
  };

  const DCOinitializationOfferCredex = await OfferCredexService(credexData);
  if (typeof DCOinitializationOfferCredex.credex === "boolean") {
    throw new Error("Invalid response from OfferCredexService");
  }
  if (DCOinitializationOfferCredex.credex && typeof DCOinitializationOfferCredex.credex.credexID === "string") {
    await AcceptCredexService(DCOinitializationOfferCredex.credex.credexID, memberID);
  } else {
    throw new Error("Invalid credexID from OfferCredexService");
  }
}
