import { ledgerSpaceDriver, searchSpaceDriver } from "../../config/neo4j/neo4j";
import { getDenominations } from "../constants/denominations";
import { CreateMemberService } from "../../Member/services/CreateMemberService";
import { CreateCompanyService } from "../../Member/services/CreateCompanyService";
import { OfferCredexService } from "../../Credex/services/OfferCredexService";
import { AcceptCredexService } from "../../Credex/services/AcceptCredexService";
import { fetchZigRate } from "./fetchZigRate";
import axios from "axios";
import { Credex } from "../../Credex/types/Credex";
import _ from "lodash";

export async function DBinitialization(): Promise<void> {
  console.log("DBinitialization start");

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  try {
    console.log("Creating database constraints and indexes...");
    await ledgerSpaceSession.run(
      `
        CREATE CONSTRAINT daynode_unique IF NOT EXISTS
        FOR (daynode:DayNode) REQUIRE daynode.Date IS UNIQUE;
      `
    );

    await ledgerSpaceSession.run(
      `
        CREATE CONSTRAINT member_unique IF NOT EXISTS
        FOR (member:Member) REQUIRE (member.memberID, member.phone, member.handle) IS UNIQUE;
      `
    );

    await ledgerSpaceSession.run(
      `
        CREATE CONSTRAINT credex_unique IF NOT EXISTS
        FOR (credex:Credex) REQUIRE credex.credexID IS UNIQUE;
      `
    );

    await ledgerSpaceSession.run(
      `
        CREATE INDEX credex_Denomination_index IF NOT EXISTS
        FOR (credex:CREDEX)
        ON (credex.Denomination);      `
    );

    //add indexes for other DCO balance updates

    await searchSpaceSession.run(
      `
        CREATE CONSTRAINT account_unique IF NOT EXISTS
        FOR (account:Account) REQUIRE account.accountID IS UNIQUE;
      `
    );

    await searchSpaceSession.run(
      `
        CREATE CONSTRAINT credex_unique IF NOT EXISTS
        FOR (credex:Credex) REQUIRE credex.credexID IS UNIQUE;
      `
    );

    await searchSpaceSession.run(
      `
        CREATE INDEX credex_dueDate_index IF NOT EXISTS
        FOR (credex:Credex) ON credex.dueDate;
      `
    );

    await searchSpaceSession.run(
      `
        CREATE INDEX securedDenom_index IF NOT EXISTS
        FOR (credex:CREDEX)
        ON credex.securedDenom;      `
    );

    await searchSpaceSession.run(
      `
        CREATE INDEX Denomination_index IF NOT EXISTS
        FOR ()-[credex:CREDEX]-()
        ON (credex.Denomination);      `
    );

    console.log("establish dayZero");
    const dayZero = "2023-06-21";
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
        CREATE (daynode:DayNode)
        SET daynode = $dayZeroCXXrates,
            daynode.Date = date($dayZero),
            daynode.Active = TRUE,
            daynode.DCOrunningNow = TRUE
      `,
      { dayZeroCXXrates, dayZero }
    );

    console.log("Creating initialization members and relationships...");
    // uses createMember instead of createCompany because OWNS relationships should not be created
    const credexFoundation = await CreateMemberService({
      memberType: "CREDEX_FOUNDATION",
      companyname: "Credex Foundation",
      handle: "credexfoundation",
      defaultDenom: "CXX",
    });
    let credexFoundationID;
    if (typeof credexFoundation.member == "boolean") {
      throw new Error("credexFoundation could not be created");
    }
    if (
      credexFoundation.member &&
      typeof credexFoundation.member.memberID === "string"
    ) {
      credexFoundationID = credexFoundation.member.memberID;
    } else {
      throw new Error("credexFoundation could not be created");
    }

    const rdubs = await CreateMemberService({
      memberType: "HUMAN",
      firstname: "Ryan",
      lastname: "Watson",
      handle: "ryanlukewatson",
      defaultDenom: "USD",
      phone: "263778177125",
      DCOgiveInCXX: 1,
      DCOdenom: CXXdenom,
    });
    let rdubsID;
    if (typeof rdubs.member == "boolean") {
      throw new Error("rdubs could not be created");
    }
    if (rdubs.member && typeof rdubs.member.memberID === "string") {
      rdubsID = rdubs.member.memberID;
    } else {
      throw new Error("rdubs could not be created");
    }

    const greatSun = await CreateCompanyService(
      {
        companyname: "Great Sun Financial",
        handle: "greatsunfinancial",
        defaultDenom: "USD",
      },
      rdubsID
    );
    if (!greatSun) {
      throw new Error("greatSun could not be created");
    }
    const greatSunID = greatSun.companyID;

    //create to secure participation in first DCO
    await ledgerSpaceSession.run(
      `
        MATCH (credexFoundation: Member { memberID: $credexFoundationID })
        MATCH (greatSun: Member { memberID: $greatSunID })
        MERGE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (greatSun)
        MERGE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (credexFoundation)
      `,
      { credexFoundationID, greatSunID }
    );

    //charging an account for participation in first DCO
    const credexData: Credex = {
      issuerMemberID: greatSunID,
      receiverMemberID: rdubsID,
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
      await AcceptCredexService(DCOinitializationOfferCredex.credex.credexID);
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
