import { ledgerSpaceDriver, searchSpaceDriver } from "../../../config/neo4j";
import { getDenominations } from "../../constants/denominations";
import { OnboardMemberController } from "../../api/Member/controllers/onboardMember";
import { UpdateMemberTierController } from "../../api/Member/controllers/updateMemberTier";
import { CreateAccountService } from "../../api/Account/services/CreateAccount";
import { OfferCredexService } from "../../api/Credex/services/OfferCredex";
import { AcceptCredexService } from "../../api/Credex/services/AcceptCredex";
import { fetchZwgRate, ZwgRateError } from "./fetchZwgRate";
import axios from "axios";
import _ from "lodash";
import moment from "moment-timezone";
import logger from "../../../config/logger";
import { v4 as uuidv4 } from 'uuid';

/**
 * Initializes the database for the Daily Credcoin Offering (DCO) process.
 * This function sets up necessary constraints, creates initial accounts,
 * and establishes the starting state for the DCO.
 */
export async function DBinitialization(): Promise<void> {
  const requestId = uuidv4();
  logger.info("Starting DBinitialization", { requestId });

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  try {
    await setupDatabaseConstraints(
      ledgerSpaceSession,
      searchSpaceSession,
      requestId
    );
    const dayZero = establishDayZero(requestId);
    const dayZeroCXXrates = await fetchAndProcessRates(dayZero, requestId);
    await createDayZeroDaynode(
      ledgerSpaceSession,
      dayZero,
      dayZeroCXXrates,
      requestId
    );
    await createInitialAccounts(ledgerSpaceSession, requestId);
  } catch (error) {
    logger.error("Error during DBinitialization", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    });
    throw error;
  } finally {
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
    logger.info("DBinitialization completed", { requestId });
  }
}

/**
 * Sets up necessary database constraints and indexes.
 */
async function setupDatabaseConstraints(
  ledgerSpaceSession: any,
  searchSpaceSession: any,
  requestId: string
): Promise<void> {
  logger.info("Creating database constraints and indexes...", { requestId });

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

  await searchSpaceSession.run(
    "CREATE CONSTRAINT accountID_unique IF NOT EXISTS FOR (account:Account) REQUIRE account.accountID IS UNIQUE"
  );
  await searchSpaceSession.run(
    "CREATE CONSTRAINT credexID_unique IF NOT EXISTS FOR (credex:Credex) REQUIRE credex.credexID IS UNIQUE"
  );

  logger.info("Database constraints and indexes created successfully", {
    requestId,
  });
}

/**
 * Establishes the day zero date.
 */
function establishDayZero(requestId: string): string {
  logger.info("Establishing day zero", { requestId });
  const dayZero =
    process.env.DEPLOYMENT === "dev"
      ? "2021-01-01"
      : moment.utc().subtract(1, "days").format("YYYY-MM-DD");
  logger.info("Day zero established", { dayZero, requestId });
  return dayZero;
}

/**
 * Fetches and processes currency rates for day zero.
 */
async function fetchAndProcessRates(dayZero: string, requestId: string): Promise<any> {
  logger.info("Loading currencies and current rates...", { requestId });
  const symbols = getDenominations({
    sourceForRate: "OpenExchangeRates",
    formatAsList: true,
  });
  const baseUrl = `https://openexchangerates.org/api/historical/${dayZero}.json?app_id=${process.env.OPEN_EXCHANGE_RATES_API}&symbols=${symbols}`;

  const {
    data: { rates: USDbaseRates },
  } = await axios.get(baseUrl);

  try {
    const zigRate = (await fetchZwgRate())[1].avg;
    USDbaseRates.ZWG = zigRate;
    logger.info("ZWG rate fetched successfully", { rate: zigRate, requestId });
  } catch (error) {
    if (error instanceof ZwgRateError) {
      logger.warn("Failed to fetch ZWG rate, excluding ZWG from denominations", { requestId, error: error.message });
      delete USDbaseRates.ZWG;
    } else {
      logger.error("Unexpected error while fetching ZWG rate", { requestId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  const OneCXXinCXXdenom = 1;
  const CXXdenom = "CAD";
  logger.info("CXX conversion rate", { rate: `${OneCXXinCXXdenom} CXX = 1 ${CXXdenom}`, requestId });

  const XAUbaseRates = _.mapValues(
    USDbaseRates,
    (value) => value / USDbaseRates.XAU
  );
  const dayZeroCXXrates = _.mapValues(
    XAUbaseRates,
    (value) => (1 / value) * OneCXXinCXXdenom * XAUbaseRates[CXXdenom]
  );
  dayZeroCXXrates.CXX = 1;

  logger.info("Day zero CXX rates calculated", { dayZeroCXXrates, requestId });
  return dayZeroCXXrates;
}

/**
 * Creates the day zero daynode in the database.
 */
async function createDayZeroDaynode(
  session: any,
  dayZero: string,
  dayZeroCXXrates: any,
  requestId: string
): Promise<void> {
  logger.info("Creating day zero daynode...", { requestId });
  await session.run(
    `
    CREATE (daynode:Daynode)
    SET daynode = $dayZeroCXXrates,
        daynode.Date = date($dayZero),
        daynode.Active = TRUE,
        daynode.DCOrunningNow = TRUE
  `,
    { dayZeroCXXrates, dayZero }
  );
  logger.info("Day zero daynode created successfully", { requestId });
}

/**
 * Creates initial accounts and relationships for the DCO process.
 */
async function createInitialAccounts(
  session: any,
  requestId: string
): Promise<void> {
  logger.info("Creating initialization accounts and relationships...", {
    requestId,
  });

  const rdubs = await createRdubsAccount(requestId);
  const credexFoundationID = await createCredexFoundation(
    rdubs.onboardedMemberID,
    requestId
  );
  const greatSunID = await createGreatSun(rdubs.onboardedMemberID, requestId);
  const vimbisoPayID = await createVimbisoPay(
    rdubs.onboardedMemberID,
    requestId
  );

  await createInitialRelationships(
    session,
    credexFoundationID,
    greatSunID,
    vimbisoPayID,
    requestId
  );
  await createInitialCredex(
    rdubs.onboardedMemberID,
    greatSunID,
    rdubs.personalAccountID,
    requestId
  );

  logger.info("Initial accounts and relationships created successfully", {
    requestId,
  });
}

async function createRdubsAccount(requestId: string): Promise<{
  onboardedMemberID: string;
  personalAccountID: string;
}> {
  const result = await OnboardMemberController(
    "Ryan",
    "Watson",
    "263778177125",
    requestId
  );

  if ("error" in result) {
    logger.error("Failed to create rdubs account", {
      error: result.error,
      requestId,
    });
    throw new Error(`Failed to create rdubs account: ${result.error}`);
  }

  const onboardedMemberID = result.memberDashboard.memberID;

  const updateTierResult = await UpdateMemberTierController(
    onboardedMemberID,
    5,
    requestId
  );
  if (!updateTierResult.success) {
    logger.error("Failed to update member tier", {
      memberID: onboardedMemberID,
      error: updateTierResult.message,
      requestId,
    });
    throw new Error(
      `Failed to update member tier: ${updateTierResult.message}`
    );
  }

  const rdubsPersonalAccount = await CreateAccountService(
    onboardedMemberID,
    "PERSONAL_CONSUMPTION",
    "Ryan Watson Personal",
    "263778177125",
    "USD",
    1,
    "CAD"
  );

  logger.info("Rdubs account created successfully", {
    memberID: onboardedMemberID,
    personalAccountID: rdubsPersonalAccount.accountID,
    requestId,
  });

  return {
    onboardedMemberID,
    personalAccountID: rdubsPersonalAccount.accountID,
  };
}

async function createCredexFoundation(
  memberID: string,
  requestId: string
): Promise<string> {
  const credexFoundation = await CreateAccountService(
    memberID,
    "CREDEX_FOUNDATION",
    "Credex Foundation",
    "credexfoundation",
    "CXX"
  );

  if (
    typeof credexFoundation.account === "boolean" ||
    !credexFoundation.accountID
  ) {
    logger.error("Failed to create Credex Foundation account", {
      memberID,
      requestId,
    });
    throw new Error("Failed to create Credex Foundation account");
  }

  logger.info("Credex Foundation account created successfully", {
    accountID: credexFoundation.accountID,
    requestId,
  });
  return credexFoundation.accountID;
}

async function createGreatSun(
  memberID: string,
  requestId: string
): Promise<string> {
  const greatSun = await CreateAccountService(
    memberID,
    "BUSINESS",
    "Great Sun Financial",
    "greatsunfinancial",
    "CAD"
  );

  if (!greatSun || !greatSun.accountID) {
    logger.error("Failed to create Great Sun account", { memberID, requestId });
    throw new Error("Failed to create Great Sun account");
  }

  logger.info("Great Sun account created successfully", {
    accountID: greatSun.accountID,
    requestId,
  });
  return greatSun.accountID;
}

async function createVimbisoPay(
  memberID: string,
  requestId: string
): Promise<string> {
  const vimbisoPay = await CreateAccountService(
    memberID,
    "BUSINESS",
    "VimbisoPay",
    "vimbisopay.audited",
    "CAD"
  );

  if (!vimbisoPay || !vimbisoPay.accountID) {
    logger.error("Failed to create VimbisoPay account", {
      memberID,
      requestId,
    });
    throw new Error("Failed to create VimbisoPay account");
  }

  logger.info("VimbisoPay account created successfully", {
    accountID: vimbisoPay.accountID,
    requestId,
  });
  return vimbisoPay.accountID;
}

async function createInitialRelationships(
  session: any,
  credexFoundationID: string,
  greatSunID: string,
  vimbisoPayID: string,
  requestId: string
): Promise<void> {
  await session.run(
    `
    MATCH (credexFoundation: Account { accountID: $credexFoundationID })
    MATCH (greatSun: Account { accountID: $greatSunID })
    MATCH (vimbisoPay: Account { accountID: $vimbisoPayID })
    MERGE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (credexFoundation)
    MERGE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (greatSun)
    MERGE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (vimbisoPay)
  `,
    { credexFoundationID, greatSunID, vimbisoPayID }
  );

  logger.info("Initial relationships created successfully", {
    credexFoundationID,
    greatSunID,
    vimbisoPayID,
    requestId,
  });
}

async function createInitialCredex(
  memberID: string,
  issuerAccountID: string,
  receiverAccountID: string,
  requestId: string
): Promise<void> {
  logger.info("Creating initial Credex for DBinitialization", { requestId });

  const credexData = {
    memberID,
    issuerAccountID,
    receiverAccountID,
    Denomination: "CAD",
    InitialAmount: 365, // fund DCO for a year with no adjustments
    credexType: "PURCHASE",
    securedCredex: true,
    requestId,
  };

  logger.debug("Offering initial Credex", { requestId, credexData });
  const DCOinitializationOfferCredex = await OfferCredexService(credexData);

  if (typeof DCOinitializationOfferCredex.credex === "boolean") {
    logger.error("Invalid response from OfferCredexService", { requestId });
    throw new Error("Invalid response from OfferCredexService");
  }

  if (
    DCOinitializationOfferCredex.credex &&
    typeof DCOinitializationOfferCredex.credex.credexID === "string"
  ) {
    logger.info("Initial Credex offered successfully", {
      requestId,
      credexID: DCOinitializationOfferCredex.credex.credexID,
    });

    logger.debug("Accepting initial Credex", {
      requestId,
      credexID: DCOinitializationOfferCredex.credex.credexID,
      memberID,
    });
    await AcceptCredexService(
      DCOinitializationOfferCredex.credex.credexID,
      memberID,
      requestId
    );
    logger.info("Initial Credex accepted successfully", {
      requestId,
      credexID: DCOinitializationOfferCredex.credex.credexID,
    });
  } else {
    logger.error("Invalid credexID from OfferCredexService", { requestId });
    throw new Error("Invalid credexID from OfferCredexService");
  }

  logger.info("Initial Credex creation completed", { requestId });
}

// ... [rest of the code remains unchanged] ...
