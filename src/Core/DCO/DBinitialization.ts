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

export async function DBinitialization(): Promise<void> {
  console.log("DBinitialization start");

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  try {
    console.log("Creating database constraints and indexes...");

    //remove any current db constraints
    await ledgerSpaceSession.run(
      `
      CALL apoc.schema.assert({}, {})
      `
    );

    await searchSpaceSession.run(
      `
      CALL apoc.schema.assert({}, {})
      `
    );

    //set constraints
    await ledgerSpaceSession.run(
      `
      CREATE CONSTRAINT daynodeDate_unique IF NOT EXISTS
      FOR (daynode:Daynode) REQUIRE daynode.Date IS UNIQUE
      `
    );

    await ledgerSpaceSession.run(
      `
      CREATE CONSTRAINT memberID_unique IF NOT EXISTS
      FOR (member:Member) REQUIRE member.memberID IS UNIQUE
      `
    );

    await ledgerSpaceSession.run(
      `
      CREATE CONSTRAINT memberHandle_unique IF NOT EXISTS
      FOR (member:Member) REQUIRE member.memberHandle IS UNIQUE
      `
    );

    await ledgerSpaceSession.run(
      `
      CREATE CONSTRAINT memberPhone_unique IF NOT EXISTS
      FOR (member:Member) REQUIRE member.phone IS UNIQUE
      `
    );

    await ledgerSpaceSession.run(
      `
      CREATE CONSTRAINT accountID_unique IF NOT EXISTS
      FOR (account:Account) REQUIRE account.accountID IS UNIQUE
      `
    );

    await ledgerSpaceSession.run(
      `
      CREATE CONSTRAINT accountHandle_unique IF NOT EXISTS
      FOR (account:Account) REQUIRE account.accountHandle IS UNIQUE
      `
    );

    await searchSpaceSession.run(
      `
      CREATE CONSTRAINT accountID_unique IF NOT EXISTS
      FOR (account:Account) REQUIRE account.accountID IS UNIQUE
      `
    );

    await searchSpaceSession.run(
      `
      CREATE CONSTRAINT credexID_unique IF NOT EXISTS
      FOR (credex:Credex) REQUIRE credex.credexID IS UNIQUE
      `
    );

    console.log("establish dayZero");
    const dayZero = "2024-08-15";
    console.log("dayZero:", dayZero);

    const OneCXXinCXXdenom = 1;
    const CXXdenom = "CAD";
    console.log(OneCXXinCXXdenom + " CXX = 1 " + CXXdenom);

    console.log("Loading currencies and current rates...");
    const symbols = getDenominations({
      sourceForRate: "OpenExchangeRates",
      formatAsList: true,
    });
    // docs: https://docs.openexchangerates.org/reference/historical-json
    const baseUrl = `https://openexchangerates.org/api/historical/${dayZero}.json?app_id=${process.env.OPEN_EXCHANGE_RATES_API}&symbols=${symbols}`;
    const {
      data: { rates: USDbaseRates },
    } = await axios.get(baseUrl);

    //this always gets current rates (not historical for dev)
    USDbaseRates.ZIG = (await fetchZigRate())[1].avg;

    //convert USD base rate from query to XAU
    const XAUbaseRates = _.mapValues(
      USDbaseRates,
      (value) => value / USDbaseRates.XAU
    );

    console.log("Establishing dayZero CXX rates...");
    const dayZeroCXXrates = _.mapValues(
      XAUbaseRates,
      (value) => (1 / value) * OneCXXinCXXdenom * XAUbaseRates[CXXdenom]
    );
    //add CXX to rates
    dayZeroCXXrates.CXX = 1;
    console.log("dayZeroCXXrates:");
    console.log(dayZeroCXXrates);

    console.log("Creating dayzero daynode...");
    await ledgerSpaceSession.run(
      `
        CREATE (daynode:Daynode)
        SET daynode = $dayZeroCXXrates,
            daynode.Date = date($dayZero),
            daynode.Active = TRUE,
            daynode.DCOrunningNow = TRUE
      `,
      { dayZeroCXXrates, dayZero }
    );

    console.log("Creating initialization accounts and relationships...");

    //create initial member
    const rdubs = await OnboardMemberService("Ryan", "Watson", "263778177125");
    if (typeof rdubs.onboardedMemberID == "boolean") {
      throw new Error("rdubs could not be created");
    }

    //update rdubs member tier to enable account creation below
    const tierUpdated = await UpdateMemberTierService(
      rdubs.onboardedMemberID,
      5
    );
    if (!tierUpdated) {
      throw new Error("rdubs memberTier could not be updated");
    }

    const rdubsPersonalAccount = await CreateAccountService(
      rdubs.onboardedMemberID,
      "PERSONAL_CONSUMPTION",
      "Ryan Watson Personal",
      "ryanlukewatson",
      "USD",
      1,
      CXXdenom
    );

    const rdubsAccountID = rdubsPersonalAccount.accountID;

    //create credex foundation
    const credexFoundation = await CreateAccountService(
      rdubs.onboardedMemberID,
      "CREDEX_FOUNDATION",
      "Credex Foundation",
      "credexfoundation",
      "CXX"
    );
    let credexFoundationID;
    if (typeof credexFoundation.account == "boolean") {
      throw new Error("credexFoundation could not be created");
    }
    if (
      credexFoundation.accountID &&
      typeof credexFoundation.accountID === "string"
    ) {
      credexFoundationID = credexFoundation.accountID;
    } else {
      throw new Error("credexFoundation could not be created");
    }

    //create great sun
    const greatSun = await CreateAccountService(
      rdubs.onboardedMemberID,
      "BUSINESS",
      "Great Sun Financial",
      "greatsunfinancial",
      "CAD"
    );
    if (!greatSun) {
      throw new Error("greatSun could not be created");
    }
    const greatSunID = greatSun.accountID;

    //create vimbisopay
    const vimbisoPay = await CreateAccountService(
      rdubs.onboardedMemberID,
      "BUSINESS",
      "VimbisoPay",
      "vimbisopay.audited",
      "CAD"
    );
    if (!greatSun) {
      throw new Error("vimbisoPay could not be created");
    }
    const vimbisoPayID = vimbisoPay.accountID;

    //create to secure participation in first DCO
    await ledgerSpaceSession.run(
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

    //charging an account for participation in first DCO
    const credexData = {
      memberID: rdubs.onboardedMemberID,
      issuerAccountID: greatSunID,
      receiverAccountID: rdubsAccountID,
      Denomination: CXXdenom,
      InitialAmount: OneCXXinCXXdenom * 365, // fund DCO for a year with no adjustments
      credexType: "PURCHASE",
      securedCredex: true,
    };

    const DCOinitializationOfferCredex = await OfferCredexService(credexData);
    if (typeof DCOinitializationOfferCredex.credex == "boolean") {
      throw new Error("Invalid response from OfferCredexService");
    }
    if (
      DCOinitializationOfferCredex.credex &&
      typeof DCOinitializationOfferCredex.credex.credexID === "string"
    ) {
      await AcceptCredexService(
        DCOinitializationOfferCredex.credex.credexID,
        rdubs.onboardedMemberID
      );
    } else {
      throw new Error("Invalid credexID from OfferCredexService");
    }
  } catch (error) {
    console.error("Error during DBinitialization:", error);
  } finally {
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
  }
}
