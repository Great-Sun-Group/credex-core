import { ledgerSpaceDriver, searchSpaceDriver } from "../../../config/neo4j";
import { getDenominations } from "../../constants/denominations";
import { OnboardMemberController } from "../../api/Member/controllers/onboardMember";
import { UpdateMemberTierController } from "../../api/DevAdmin/controllers/updateMemberTier";
import { CreateAccountService } from "../../api/Account/services/CreateAccount";
import { CreateCredexService } from "../../api/Credex/services/CreateCredex";
import { AcceptCredexService } from "../../api/Credex/services/AcceptCredex";
import { setDCOparticipantRateExpressHandler } from "../../api/Member/controllers/setDCOparticipantRate";
import { fetchZwgRate, ZwgRateError } from "./fetchZwgRate";
import axios from "axios";
import _ from "lodash";
import moment from "moment-timezone";
import logger from "../../utils/logger";
import { v4 as uuidv4 } from "uuid";

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
    await createInitialMembersAndAccounts(ledgerSpaceSession, requestId);
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
    process.env.NODE_ENV === "development"
      ? "2021-01-01"
      : moment.utc().subtract(1, "days").format("YYYY-MM-DD");
  logger.info("Day zero established", { dayZero, requestId });
  return dayZero;
}

/**
 * Fetches and processes currency rates for day zero.
 */
async function fetchAndProcessRates(
  dayZero: string,
  requestId: string
): Promise<any> {
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
      logger.warn(
        "Failed to fetch ZWG rate, excluding ZWG from denominations",
        { requestId, error: error.message }
      );
      delete USDbaseRates.ZWG;
    } else {
      logger.error("Unexpected error while fetching ZWG rate", {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  const OneCXXinCXXdenom = 1;
  const CXXdenom = "CAD";
  logger.info("CXX conversion rate", {
    rate: `${OneCXXinCXXdenom} CXX = 1 ${CXXdenom}`,
    requestId,
  });

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
async function createInitialMembersAndAccounts(
  session: any,
  requestId: string
): Promise<void> {
  logger.info("Creating initialization accounts and relationships...", {
    requestId,
  });

  const rdubs = await createInitialMember(
    "Ryan",
    "Watson",
    "263778177125",
    "USD",
    true,
    requestId
  );
  const magicmike = await createInitialMember(
    "Mike",
    "Dube",
    "263787379972",
    "USD",
    false,
    requestId
  );
  const bennita = await createInitialMember(
    "Bennita",
    "Muranda",
    "263788435091",
    "USD",
    false,
    requestId
  );
  const credexFoundationID = await createInitialAccount(
    rdubs.onboardedMemberID,
    "CREDEX_FOUNDATION",
    "Credex Foundation: Daily Credcoin Offering",
    "credexfoundation.dco",
    "CXX",
    requestId
  );
  const greatSunTrustID = await createInitialAccount(
    rdubs.onboardedMemberID,
    "TRUST",
    "Great Sun Financial: Trust",
    "greatsun_trust",
    "CAD",
    requestId
  );
  const greatSunOpsID = await createInitialAccount(
    rdubs.onboardedMemberID,
    "OPERATIONS",
    "Great Sun Financial: Operations",
    "greatsun_ops",
    "CAD",
    requestId
  );
  const vimbisoPayTrustID = await createInitialAccount(
    bennita.onboardedMemberID,
    "TRUST",
    "VimbisoPay: Trust",
    "vimbisopay_trust",
    "USD",
    requestId
  );
  const vimbisoPayOpsID = await createInitialAccount(
    magicmike.onboardedMemberID,
    "OPERATIONS",
    "VimbisoPay: Operations",
    "vimbisopay_ops",
    "USD",
    requestId
  );

  await createInitialRelationships(
    session,
    credexFoundationID,
    greatSunTrustID,
    vimbisoPayTrustID,
    vimbisoPayOpsID,
    rdubs.onboardedMemberID,
    bennita.onboardedMemberID,
    requestId
  );
  await createInitialCredex(
    rdubs.onboardedMemberID,
    greatSunTrustID,
    rdubs.defaultAccountID,
    requestId
  );

  logger.info("Initial accounts and relationships created successfully", {
    requestId,
  });
}

async function createInitialMember(
  firstname: string,
  lastname: string,
  phone: string,
  defaultDenom: string,
  DCOparticipant: boolean,
  requestId: string
): Promise<{
  onboardedMemberID: string;
  defaultAccountID: string;
}> {
  const result = await OnboardMemberController(
    firstname,
    lastname,
    phone,
    defaultDenom,
    requestId
  );

  if ("error" in result) {
    logger.error("Failed to create initial account", {
      error: result.error,
      requestId,
    });
    throw new Error(`Failed to create initial account: ${result.error}`);
  }

  const onboardedMemberID = result.memberDashboard.memberID;
  const defaultAccountID = result.defaultAccountID;

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

  if (DCOparticipant) {
    // Call setDCOparticipantRateExpressHandler
    try {
      const req = {
        body: {
          memberID: onboardedMemberID,
          personalAccountID: defaultAccountID,
          DCOgiveInCXX: 1,
          DCOdenom: "CAD",
        },
      } as any;
      const res = {
        status: (code: number) => ({
          json: (data: any) => {
            if (code !== 200) {
              throw new Error(
                `Failed to set DCO participant rate: ${JSON.stringify(data)}`
              );
            }
          },
        }),
      } as any;

      await setDCOparticipantRateExpressHandler(req, res);
      logger.info("DCO participant rate set successfully", {
        memberID: onboardedMemberID,
        requestId,
      });
    } catch (error) {
      logger.error("Failed to set DCO participant rate", {
        memberID: onboardedMemberID,
        error: error instanceof Error ? error.message : String(error),
        requestId,
      });
      throw error;
    }
  }

  return {
    onboardedMemberID,
    defaultAccountID,
  };
}

async function createInitialAccount(
  memberID: string,
  accountType: string,
  accountName: string,
  accountHandle: string,
  defaaultDenom: string,
  requestId: string
): Promise<string> {
  const addnlAccount = await CreateAccountService(
    memberID,
    accountType,
    accountName,
    accountHandle,
    defaaultDenom
  );

  if (!addnlAccount || !addnlAccount.accountID) {
    logger.error("Failed to create additional account", {
      accountHandle,
      requestId,
    });
    throw new Error("Failed to create additional account");
  }

  logger.info("Account created successfully", {
    accountHandle: accountHandle,
    accountID: addnlAccount.accountID,
    requestId,
  });
  return addnlAccount.accountID;
}

async function createInitialRelationships(
  session: any,
  credexFoundationID: string,
  greatSunTrustID: string,
  vimbisoPayTrustID: string,
  vimbisoPayOpsID: string,
  rdubsID: string,
  bennitaID: string,
  requestId: string
): Promise<void> {
  await session.run(
    `
    MATCH (credexFoundation: Account { accountID: $credexFoundationID })
    MATCH (greatSun: Account { accountID: $greatSunTrustID })
    MATCH (vimbisoPayTrust: Account { accountID: $vimbisoPayTrustID })
    MATCH (vimbisoPayOps: Account { accountID: $vimbisoPayOpsID })
    MATCH (rdubs: Member { memberID: $rdubsID })
    MATCH (bennita: Member { memberID: $bennitaID })
    CREATE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (credexFoundation)
    CREATE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (greatSun)
    CREATE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (vimbisoPayTrust)
    CREATE (rdubs) - [:AUTHORIZED_FOR] -> (vimbisoPayTrust)
    CREATE (rdubs) - [:AUTHORIZED_FOR] -> (vimbisoPayOps)
    CREATE (bennita) - [:AUTHORIZED_FOR] -> (vimbisoPayOps)
  `,
    {
      credexFoundationID,
      greatSunTrustID,
      vimbisoPayTrustID,
      vimbisoPayOpsID,
      rdubsID,
      bennitaID,
    }
  );

  logger.info("Initial relationships created successfully", {
    credexFoundationID,
    greatSunTrustID,
    vimbisoPayTrustID,
    vimbisoPayOpsID,
    rdubsID,
    bennitaID,
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
    OFFERSorREQUESTS: "OFFERS",
    securedCredex: true,
    requestId,
  };

  logger.debug("Offering initial Credex", { requestId, credexData });
  const DCOinitializationCreateCredex = await CreateCredexService(credexData);

  if (typeof DCOinitializationCreateCredex.credex === "boolean") {
    logger.error("Invalid response from CreateCredexService", { requestId });
    throw new Error("Invalid response from CreateCredexService");
  }

  if (
    DCOinitializationCreateCredex.credex &&
    typeof DCOinitializationCreateCredex.credex.credexID === "string"
  ) {
    logger.info("Initial Credex offered successfully", {
      requestId,
      credexID: DCOinitializationCreateCredex.credex.credexID,
    });

    logger.debug("Accepting initial Credex", {
      requestId,
      credexID: DCOinitializationCreateCredex.credex.credexID,
      memberID,
    });
    await AcceptCredexService(
      DCOinitializationCreateCredex.credex.credexID,
      memberID,
      requestId
    );
    logger.info("Initial Credex accepted successfully", {
      requestId,
      credexID: DCOinitializationCreateCredex.credex.credexID,
    });
  } else {
    logger.error("Invalid credexID from CreateCredexService", { requestId });
    throw new Error("Invalid credexID from CreateCredexService");
  }

  logger.info("Initial Credex creation completed", { requestId });
}
