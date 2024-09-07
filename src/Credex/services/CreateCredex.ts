import { ledgerSpaceDriver } from "../../../config/neo4j";
import { denomFormatter } from "../../Core/constants/denominations";
import { GetSecuredAuthorizationService } from "./GetSecuredAuthorization";

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

  let OFFEREDorREQUESTED = OFFERSorREQUESTS === "OFFERS" ? "OFFERED" : "REQUESTED";

  try {
    // Get securable data for secured credex
    let secureableData = { securerID: "", securableAmountInDenom: 0 };
    if (securedCredex) {
      secureableData = await GetSecuredAuthorizationService(
        issuerAccountID,
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
