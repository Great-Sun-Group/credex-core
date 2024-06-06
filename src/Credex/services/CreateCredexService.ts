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
import {
  getDenominations,
  denomFormatter,
} from "../../Core/constants/denominations";
import { GetSecuredAuthorizationService } from "./GetSecuredAuthorizationService";
import { Credex } from "../types/Credex";
import { checkDueDate, credspan } from "../../Core/constants/credspan";
import { checkPermittedCredexType } from "../../Core/constants/credexTypes";

export async function CreateCredexService(credexData: Credex) {
  const {
    issuerMemberID,
    receiverMemberID,
    InitialAmount,
    Denomination,
    credexType,
    OFFERSorREQUESTS,
    securedCredex = false,
    dueDate = "",
  } = credexData;

  // Validate input data
  if (
    !issuerMemberID ||
    !receiverMemberID ||
    !InitialAmount ||
    !Denomination ||
    !credexType ||
    !OFFERSorREQUESTS ||
    (securedCredex && dueDate) ||
    (!securedCredex && !dueDate)
  ) {
    let failMessage = "Data missing or mismatch, could not create credex.";
    if (!issuerMemberID) failMessage += " issuerMemberID required";
    if (!receiverMemberID) failMessage += " receiverMemberID required";
    if (!InitialAmount) failMessage += " InitialAmount required";
    if (!Denomination) failMessage += " Denomination required";
    if (!credexType) failMessage += " credexType required";
    if (!OFFERSorREQUESTS) failMessage += " OFFERSorREQUESTS required";
    if (securedCredex && dueDate)
      failMessage += " Secured credex cannot have a due date";
    if (!securedCredex && !dueDate)
      failMessage += " Unsecured credex must have a due date";
    console.log(credexData);
    return { credex: false, message: failMessage };
  }

  // make sure InitialAmount is a number
  if (typeof InitialAmount != "number") {
    return {
      credex: false,
      message: "Error: InitialAmount must be a number",
    };
  }

  // Check denomination validity
  if (!getDenominations({ code: Denomination }).length) {
    return {
      credex: false,
      message: "Error: denomination not permitted"
    };
  }

  // Check credex type validity
  if (!checkPermittedCredexType(credexType)) {
    return { credex: false, message: "Error: credex type not permitted" };
  }

  // Validate OFFERSorREQUESTS and set OFFEREDorREQUESTED accordingly
  let OFFEREDorREQUESTED = "";
  if (OFFERSorREQUESTS === "OFFERS") {
    OFFEREDorREQUESTED = "OFFERED";
  } else if (OFFERSorREQUESTS === "REQUESTS") {
    OFFEREDorREQUESTED = "REQUESTED";
  } else {
    return { credex: false, message: "Error: invalid OFFER/REQUEST" };
  }

  // Check due date for unsecured credex
  if (!securedCredex && !checkDueDate(dueDate)) {
    return {
      credex: false,
      message: `Error: due date must be permitted date, in format YYYY-MM-DD. First permitted due date is 1 week from today. Last permitted due date is ${
        credspan / 7
      } weeks from today.`,
    };
  }

  // Get securable data for secured credex
  let secureableData = { securerID: "", securableAmountInDenom: 0 };
  if (securedCredex) {
    secureableData = await GetSecuredAuthorizationService(
      issuerMemberID,
      Denomination
    );
    if (secureableData.securableAmountInDenom < InitialAmount) {
      return {
        credex: false,
        message: `Error: Your secured credex for ${denomFormatter(
          InitialAmount,
          Denomination
        )} ${Denomination} cannot be issued because your maximum securable ${Denomination} balance is ${denomFormatter(
          secureableData.securableAmountInDenom,
          Denomination
        )} ${Denomination}`,
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

    // Add secured relationships for secured credex
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
    return { credex: false, message: "Error creating credex: " + error };
  } finally {
    await ledgerSpaceSession.close();
  }
}
