import express from "express";
import { CreateAccountService } from "../services/CreateAccount";
import { getDenominations } from "../../Core/constants/denominations";
import { checkPermittedAccountType } from "../../Core/constants/accountTypes";

export async function CreateAccountController(
  req: express.Request,
  res: express.Response
): Promise<void> {
  const fieldsRequired = [
    "ownerID",
    "accountType",
    "accountName",
    "accountHandle",
    "defaultDenom",
  ];

  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      res.status(400).json({ message: `${field} is required` });
      return;
    }
  }

  const { ownerID, accountType, accountName, accountHandle, defaultDenom, DCOgiveInCXX, DCOdenom } = req.body;

  // Validate defaultDenom
  if (!getDenominations({ code: defaultDenom }).length) {
    res.status(400).json({ message: "defaultDenom not in denoms" });
    return;
  }

  // Validate accountType
  if (!checkPermittedAccountType(accountType)) {
    res.status(400).json({ message: "Error: accountType not permitted" });
    return;
  }

  // Validate and transform accountHandle
  const transformedAccountHandle = accountHandle.toLowerCase().replace(/\s/g, "");
  if (!/^[a-z0-9._]+$/.test(transformedAccountHandle)) {
    res.status(400).json({
      message: "Invalid account handle. Only lowercase letters, numbers, periods, and underscores are allowed.",
    });
    return;
  }

  // Validate DCOdenom if provided
  if (DCOdenom && !getDenominations({ code: DCOdenom }).length) {
    res.status(400).json({ message: "DCOdenom not in denoms" });
    return;
  }

  try {
    const newAccount = await CreateAccountService(
      ownerID,
      accountType,
      accountName,
      transformedAccountHandle,
      defaultDenom,
      DCOgiveInCXX,
      DCOdenom
    );

    if (newAccount.accountID) {
      res.status(200).json(newAccount.accountID);
    } else {
      res.status(400).json({ message: newAccount.message });
    }
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
