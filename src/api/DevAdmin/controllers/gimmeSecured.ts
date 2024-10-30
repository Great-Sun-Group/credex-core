import express, { Response } from "express";
import logger from "../../../utils/logger";
import { CreateCredexService } from "../../Credex/services/CreateCredex";
import { GetMemberByHandleService } from "../../Member/services/GetMemberByHandle";
import { GetAccountByHandleService } from "../../Account/services/GetAccountByHandle";

export async function GimmeSecuredController(req: express.Request, res: Response) {
  logger.info("Entering GimmeSecuredController");
  try {
    const { accountHandle, denom, amount } = req.body;

    const bennita = await GetMemberByHandleService("263788435091");
    const bennitaID = bennita.memberID;
    const vimbisopay_trust =
      await GetAccountByHandleService("vimbisopay_trust");
    const vimbisopay_trustID = vimbisopay_trust.accountID;
    const recipient = await GetAccountByHandleService(accountHandle);
    const recipientID = recipient.accountID;
    const requestId = "dummy";

    const credexData = {
      memberID: bennitaID,
      issuerAccountID: vimbisopay_trustID,
      receiverAccountID: recipientID,
      Denomination: denom,
      InitialAmount: amount,
      credexType: "PURCHASE",
      OFFERSorREQUESTS: "OFFERS",
      securedCredex: true,
      requestId,
    };

    logger.debug("Offering gimmeSecured Credex", { credexData });
    const gimmeCreateCredex = await CreateCredexService(credexData);

    if (typeof gimmeCreateCredex.credex === "boolean") {
      logger.error("Invalid response from CreateCredexService");
      throw new Error("Invalid response from CreateCredexService");
    }

    if (
      gimmeCreateCredex.credex &&
      typeof gimmeCreateCredex.credex.credexID === "string"
    ) {
      logger.info("gimmeSecured credex offered successfully", {
        requestId,
        credexID: gimmeCreateCredex.credex.credexID,
      });
    } else {
      logger.error("Invalid credexID from CreateCredexService");
      throw new Error("Invalid credexID from CreateCredexService");
    }

    logger.info("gimmeSecured Credex creation completed");
    res.status(200).json({ message: "gimmeSecured Credex creation completed" });
    return;
  } catch (error) {
    logger.error("Error creating gimmeSecured credex", { error });
    res.status(500).json({
      error: "An error occurred while creating gimmeSecured credex",
    });
  }
}
