/*
Creates a credex

required inputs:
  issuerMemberID,
  receiverMemberID,
  InitialAmount,
  Denomination,
  credexType,
  OFFERSorREQUESTS

optional/conditional inputs:
  securedCredex,
  dueDate,
either a credex needs to be securedCredex = true or it needs
a due date within the credspan declared in Core/constants/credspan

on success returns:
 credex: object with all fields on the credex
 message: "Credex created"

if conditions above are not met, or if secured credex attempted but not authorized, returns:
  credex: false
  message: error message depending on which condition not met
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { getDenominations } from "../../Core/constants/denominations";
import { GetSecuredAuthorizationService } from "./GetSecuredAuthorizationService";
import { Credex } from "../types/Credex";
import { checkDueDate, credspan } from "../../Core/constants/credspan";
import { checkPermittedCredexType } from "../../Core/constants/credexTypes";
import { denomFormatter } from "../../Core/constants/denominations";

export async function CreateCredexService(credexData: Credex) {
  // Destructure input data
  const {
    issuerMemberID,
    receiverMemberID,
    InitialAmount,
    Denomination,
    credexType,
    OFFERSorREQUESTS,
    securedCredex,
    dueDate,
  } = credexData;

  // Check for required data
  if (
    !issuerMemberID ||
    !receiverMemberID ||
    !InitialAmount ||
    !Denomination ||
    !credexType ||
    !OFFERSorREQUESTS
  ) {
    return {
      credex: false,
      message: "Error: data missing, could not create credex",
    };
  }

  // Check that the denomination code is valid
  if (!getDenominations({ code: Denomination }).length) {
    return {
      credex: false,
      message: "Error: denomination not permitted",
    };
  }

  //check that credex type is valid
  if (!checkPermittedCredexType(credexType)) {
    return {
      credex: false,
      message: "Error: credex type not permitted",
    };
  }

  //check that offers/requests is valid and set OFFEREDorREQUESTED accordingly
  var OFFEREDorREQUESTED = "";
  if (OFFERSorREQUESTS == "OFFERS") {
    OFFEREDorREQUESTED = "OFFERED";
  } else if (OFFERSorREQUESTS == "REQUESTS") {
    OFFEREDorREQUESTED = "REQUESTED";
  } else {
    return {
      credex: false,
      message: "Error: invalid OFFER/REQUEST",
    };
  }

  // Check that a secured credex isn't being created with a due date
  if (securedCredex && dueDate) {
    return {
      credex: false,
      message: "Error: secured credex can't have a due date",
    };
  }

  // For unsecured credex, check that due date exists and is within permitted credspan
  if (!securedCredex && !dueDate) {
    return {
      credex: false,
      message: "Error: unsecured credex requires a due date",
    };
  } else if (!securedCredex && !checkDueDate(dueDate)) {
    return {
      credex: false,
      message: `Error: due date must be permitted date, in format YYYY-MM-DD. First permitted due date is 1 week from today. Last permitted due date is ${credspan/7} weeks from today.`,
    };
  }

  // For secured credex, get securingMemberID if authorized
  let secureableData = { securerID: "", securableAmountInDenom: 0 };
  if (securedCredex) {
    secureableData = await GetSecuredAuthorizationService(
      issuerMemberID,
      Denomination
    );
    if (secureableData.securableAmountInDenom < InitialAmount) {
      return {
        credex: false,
        message: "Error: Your secured credex for " + denomFormatter(
          InitialAmount,
          Denomination
        ) + " " + Denomination + " cannot be issued because your maximum securable " +
        Denomination + " balance is " +
        denomFormatter(
            secureableData.securableAmountInDenom,
            Denomination
          ) + " " + Denomination,
      };
    }
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    // Create the credex
    const createCredexQuery = await ledgerSpaceSession.run(
      `
        MATCH (daynode:DayNode {Active: true})
        MATCH (issuer:Member {memberID: $issuerMemberID})
        MATCH (receiver:Member {memberID: $receiverMemberID})
        CREATE (newCredex:Credex)
        SET
          newCredex.credexID = randomUUID(),
          newCredex.Denomination = $Denomination,
          newCredex.CXXmultiplier = daynode[$Denomination],
          newCredex.InitialAmount = $InitialAmount * daynode[$Denomination],
          newCredex.OutstandingAmount = $InitialAmount * daynode[$Denomination],
          newCredex.RedeemedAmount = 0,
          newCredex.DefaultedAmount = 0,
          newCredex.WrittenOffAmount = 0,
          newCredex.credexType = $credexType,
          newCredex.dueDate = $dueDate,
          newCredex.createdAt = datetime(),
          newCredex.queueStatus = "PENDING_CREDEX"
        MERGE (newCredex)-[:CREATED_ON]->(daynode)
        MERGE (issuer)-[:${OFFERSorREQUESTS}]->(newCredex)-[:${OFFERSorREQUESTS}]->(receiver)
        MERGE (issuer)-[:${OFFEREDorREQUESTED}]->(newCredex)-[:${OFFEREDorREQUESTED}]->(receiver)
        RETURN newCredex AS newCredex
      `,
      {
        issuerMemberID,
        receiverMemberID,
        InitialAmount,
        Denomination,
        credexType,
        dueDate,
      }
    );

    const newCredex = createCredexQuery.records[0].get("newCredex").properties;

    // Add secured relationships to secured credex
    if (securedCredex && secureableData.securerID) {
      await ledgerSpaceSession.run(
        `
          MATCH (newCredex:Credex {credexID: $newCredexID})
          MATCH (securingMember: Member {memberID: $securingMemberID})
          MERGE (securingMember)-[:SECURES]->(newCredex)
        `,
        {
          newCredexID: newCredex.credexID,
          securingMemberID: secureableData.securerID,
        }
      );
    }
    return {
      credex: newCredex,
      message: "Credex created: " + newCredex.credexID,
    };
  } catch (error) {
    return {
      credex: false,
      message: "Error creating credex: " + error,
    };
  } finally {
    await ledgerSpaceSession.close();
  }
}
