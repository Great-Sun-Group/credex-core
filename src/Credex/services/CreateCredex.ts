import { ledgerSpaceDriver } from "../../../config/neo4j";
import {
  getDenominations,
  denomFormatter,
} from "../../Core/constants/denominations";
import { GetSecuredAuthorizationService } from "./GetSecuredAuthorization";
import { checkDueDate, credspan } from "../../Core/constants/credspan";
import { checkPermittedCredexType } from "../../Core/constants/credexTypes";
import { SecuredCredexAuthForTierController } from "../../Member/controllers/securedCredexAuthForTier";

export async function CreateCredexService(credexData: any) {
  const {
    issuerAccountID,
    receiverAccountID,
    InitialAmount,
    Denomination,
    credexType,
    OFFERSorREQUESTS,
    securedCredex = false,
    dueDate = "",
  } = credexData;

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  // Validate input data
  if (
    !issuerAccountID ||
    !receiverAccountID ||
    issuerAccountID == receiverAccountID ||
    !InitialAmount ||
    !Denomination ||
    !credexType ||
    !OFFERSorREQUESTS ||
    (securedCredex && dueDate) ||
    (!securedCredex && !dueDate)
  ) {
    let failMessage = "Data missing or mismatch, could not create credex.";
    if (!issuerAccountID) failMessage += " issuerAccountID required";
    if (!receiverAccountID) failMessage += " receiverAccountID required";
    if (issuerAccountID == receiverAccountID)
      failMessage += " issuer and receiver cannot be the same account";
    if (!InitialAmount) failMessage += " InitialAmount required";
    if (!Denomination) failMessage += " Denomination required";
    if (!credexType) failMessage += " credexType required";
    if (!OFFERSorREQUESTS) failMessage += " OFFERSorREQUESTS required";
    if (securedCredex && dueDate)
      failMessage += " Secured credex cannot have a due date";
    if (!securedCredex && !dueDate)
      failMessage += " Unsecured credex must have a due date";
    console.log(failMessage);
    console.log(credexData);
    return { credex: false, message: failMessage };
  }

  // make sure InitialAmount is a number
  if (typeof InitialAmount != "number") {
    const message = "Error: InitialAmount must be a number";
    console.log(message);
    console.log(credexData);
    return {
      credex: false,
      message: message,
    };
  }

  // Check denomination validity
  if (!getDenominations({ code: Denomination }).length) {
    const message = "Error: denomination not permitted";
    console.log(message);
    console.log(credexData);
    return {
      credex: false,
      message: message,
    };
  }

  // Check credex type validity
  if (!checkPermittedCredexType(credexType)) {
    const message = "Error: credex type not permitted";
    console.log(message);
    console.log(credexData);
    return {
      credex: false,
      message: message,
    };
  }

  // Validate OFFERSorREQUESTS and set OFFEREDorREQUESTED accordingly
  let OFFEREDorREQUESTED = "";
  if (OFFERSorREQUESTS === "OFFERS") {
    OFFEREDorREQUESTED = "OFFERED";
  } else if (OFFERSorREQUESTS === "REQUESTS") {
    OFFEREDorREQUESTED = "REQUESTED";
  } else {
    const message = "Error: invalid OFFER/REQUEST";
    console.log(message);
    console.log(credexData);
    return {
      credex: false,
      message: message,
    };
  }

  // Check due date for unsecured credex
  if (!securedCredex) {
    const dueDateOK = await checkDueDate(dueDate);
    if (!dueDateOK) {
      const message = `Error: due date must be permitted date, in format YYYY-MM-DD. First permitted due date is 1 week from today. Last permitted due date is ${
        credspan / 7
      } weeks from today.`;
      console.log(message);
      console.log(credexData);
      return {
        credex: false,
        message: message,
      };
    }
  }

  //check that secured credex is within limits of membership tier
  if (securedCredex) {
    const getMemberTier = await ledgerSpaceSession.run(
      `
        MATCH (member:Member)-[:OWNS]->(account:Account { accountID: $issuerAccountID })
        RETURN member.memberTier as memberTier
      `,
      { issuerAccountID }
    );

    const memberTier = getMemberTier.records[0].get("memberTier");
    const tierAuth = await SecuredCredexAuthForTierController(
      issuerAccountID,
      memberTier,
      InitialAmount,
      Denomination
    );
    if (!tierAuth.isAuthorized) {
      return {
        credex: false,
        message: tierAuth.message,
      };
    }
  }

  //check that unsecured credex is permitted on membership tier
  if (!securedCredex) {
    const getMemberTier = await ledgerSpaceSession.run(
      `
        MATCH (member:Member)-[:OWNS]->(account:Account { accountID: $issuerAccountID })
        RETURN member.memberTier as memberTier
      `,
      { issuerAccountID }
    );

    const memberTier = getMemberTier.records[0].get("memberTier");
    if (memberTier == 1) {
      return {
        credex: false,
        message: "Members on the Open Tier cannot issue unsecured credexes",
      };
    }
  }

  // Get securable data for secured credex
  let secureableData = { securerID: "", securableAmountInDenom: 0 };
  if (securedCredex) {
    secureableData = await GetSecuredAuthorizationService(
      issuerAccountID,
      Denomination
    );
    if (secureableData.securableAmountInDenom < InitialAmount) {
      console.log("secureableData.securableAmountInDenom: ");
      console.log(secureableData.securableAmountInDenom);
      console.log("InitialAmount: ");
      console.log(InitialAmount);

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

  try {
    // Create the credex
    const createCredexQuery = await ledgerSpaceSession.run(
      `
        MATCH (daynode:Daynode {Active: true})
        MATCH (issuer:Account {accountID: $issuerAccountID})
        MATCH (receiver:Account {accountID: $receiverAccountID})
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
          newCredex.createdAt = datetime(),
          newCredex.queueStatus = "PENDING_CREDEX"
        MERGE (newCredex)-[:CREATED_ON]->(daynode)
        MERGE (issuer)-[:${OFFERSorREQUESTS}]->(newCredex)-[:${OFFERSorREQUESTS}]->(receiver)
        MERGE (issuer)-[:${OFFEREDorREQUESTED}]->(newCredex)-[:${OFFEREDorREQUESTED}]->(receiver)
        RETURN
          newCredex.credexID AS credexID,
          receiver.accountName AS receiverAccountName
      `,
      {
        issuerAccountID,
        receiverAccountID,
        InitialAmount,
        Denomination,
        credexType,
      }
    );

    const credexID = createCredexQuery.records[0].get("credexID");

    // Add dueDate for unsecured credex
    if (!securedCredex) {
      const addDueDateQuery = await ledgerSpaceSession.run(
        `
          MATCH (newCredex:Credex {credexID: $credexID})
          SET newCredex.dueDate = date($dueDate)
          RETURN newCredex.dueDate AS dueDate
        `,
        {
          credexID,
          dueDate,
        }
      );
      if (addDueDateQuery.records.length === 0) {
        return { credex: false, message: "error creating credex" };
      }
    }

    // Add secured relationships for secured credex
    if (securedCredex && secureableData.securerID) {
      await ledgerSpaceSession.run(
        `
          MATCH (newCredex:Credex {credexID: $credexID})
          MATCH (securingAccount: Account {accountID: $securingAccountID})
          MERGE (securingAccount)-[:SECURES]->(newCredex)
        `,
        {
          credexID,
          securingAccountID: secureableData.securerID,
        }
      );
    }

    const newCredex = {
      credexID: createCredexQuery.records[0].get("credexID"),
      formattedInitialAmount: denomFormatter(InitialAmount, Denomination),
      counterpartyAccountName: createCredexQuery.records[0].get(
        "receiverAccountName"
      ),
      secured: securedCredex,
      dueDate: dueDate,
    };

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
