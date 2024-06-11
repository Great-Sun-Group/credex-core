import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
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
  const searchSpaceSession = ledgerSpaceDriver.session();

  try {
    console.log("Creating database constraints...");
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

    await searchSpaceSession.run(
      `
        CREATE CONSTRAINT member_unique IF NOT EXISTS
        FOR (member:Member) REQUIRE member.memberID IS UNIQUE;
      `
    );

    await searchSpaceSession.run(
      `
        CREATE CONSTRAINT credex_unique IF NOT EXISTS
        FOR ()-[credex:CREDEX]-() REQUIRE credex.credexID IS UNIQUE;
      `
    );

    console.log("establish dayZero");
    const dayZero = "2023-06-21"
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
    console.log("dayZeroCXXrates:")
    console.log(dayZeroCXXrates);

    console.log("Creating dayzero daynode...");
    await ledgerSpaceSession.run(
      `
        CREATE (dayNode:DayNode)
        SET dayNode = $dayZeroCXXrates,
            dayNode.Date = date($dayZero),
            dayNode.Active = TRUE,
            dayNode.DCOrunningNow = TRUE
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
    const credexFoundationID = credexFoundation.member.memberID;

    const rdubs = await CreateMemberService({
      memberType: "HUMAN",
      firstname: "Ryan",
      lastname: "Watson",
      handle: "ryanlukewatson",
      defaultDenom: "USD",
      phone: "263778177125",
      DailyCoinOfferingGive: OneCXXinCXXdenom,
      DailyCoinOfferingDenom: CXXdenom,
    });
    const rdubsID = rdubs.member.memberID;

    const greatSun = await CreateCompanyService(
      {
        companyname: "Great Sun Financial",
        handle: "greatsunfinancial",
        defaultDenom: "USD",
      },
      rdubsID
    );

    if (!greatSun) {
      throw new Error("Failed to create Great Sun Financial company.");
    }
    const greatSunID = greatSun?.companyID;

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
    await AcceptCredexService(DCOinitializationOfferCredex.credex.credexID);
  } catch (error) {
    console.error("Error during DBinitialization:", error);
  } finally {
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
  }
}
