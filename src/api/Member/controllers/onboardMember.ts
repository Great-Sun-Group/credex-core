import express from "express";
import { OnboardMemberService } from "../services/OnboardMember";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
import logger from "../../../utils/logger";
import { validateName, validatePhone, validateDenomination } from "../../../utils/validators";
import { generateToken } from "../../../../config/authenticate";
import { searchSpaceDriver } from "../../../../config/neo4j";
import { CreateAccountService } from "../../Account/services/CreateAccount";

export async function OnboardMemberController(
  firstname: string,
  lastname: string,
  phone: string,
  defaultDenom: string,
  requestId: string
): Promise<{ memberDashboard: any; token: string; defaultAccountID: string } | { error: string }> {
  logger.debug("Entering OnboardMemberController", {
    firstname,
    lastname,
    phone,
    defaultDenom,
    requestId,
  });

  try {
    logger.info("Onboarding new member", {
      firstname,
      lastname,
      phone,
      defaultDenom,
      requestId,
    });

    const onboardedMember = await OnboardMemberService(
      firstname,
      lastname,
      phone,
      defaultDenom
    );

    if (!onboardedMember.onboardedMemberID) {
      logger.warn("Failed to onboard member", {
        firstname,
        lastname,
        phone,
        defaultDenom,
        error: onboardedMember.message,
        requestId,
      });
      logger.debug("Exiting OnboardMemberController with onboarding failure", {
        requestId,
      });
      return { error: onboardedMember.message || "Failed to onboard member" };
    }

    logger.info("Member onboarded successfully", {
      memberID: onboardedMember.onboardedMemberID,
      defaultDenom,
      requestId,
    });

    // Create default account for the new member
    logger.debug("Creating default account for new member", {
      memberID: onboardedMember.onboardedMemberID,
      defaultDenom,
      requestId,
    });
    const defaultAccount = await CreateAccountService(
      onboardedMember.onboardedMemberID,
      "PERSONAL_CONSUMPTION",
      `${firstname} ${lastname} Personal`,
      phone,
      defaultDenom,
      null,
      null
    );

    if (!defaultAccount.accountID) {
      logger.warn("Failed to create default account for new member", {
        memberID: onboardedMember.onboardedMemberID,
        defaultDenom,
        error: defaultAccount.message,
        requestId,
      });
      return { error: "Failed to create default account for new member" };
    }

    logger.info("Default account created successfully", {
      memberID: onboardedMember.onboardedMemberID,
      accountID: defaultAccount.accountID,
      defaultDenom,
      requestId,
    });

    // Generate token
    const token = generateToken(onboardedMember.onboardedMemberID);

    // Save token to Neo4j
    const session = searchSpaceDriver.session();
    try {
      await session.run(
        "MATCH (m:Member {id: $memberId}) SET m.token = $token",
        { memberId: onboardedMember.onboardedMemberID, token }
      );
    } finally {
      await session.close();
    }

    logger.debug("Retrieving member dashboard", { phone, defaultDenom, requestId });
    const memberDashboard = await GetMemberDashboardByPhoneService(phone);
    if (!memberDashboard) {
      logger.warn("Could not retrieve member dashboard after onboarding", {
        phone,
        defaultDenom,
        memberID: onboardedMember.onboardedMemberID,
        requestId,
      });
      logger.debug(
        "Exiting OnboardMemberController with dashboard retrieval failure",
        { requestId }
      );
      return { error: "Could not retrieve member dashboard" };
    }

    logger.info("Member dashboard retrieved successfully", {
      memberID: onboardedMember.onboardedMemberID,
      defaultDenom,
      requestId,
    });
    logger.debug("Exiting OnboardMemberController successfully", { requestId });
    return { memberDashboard, token, defaultAccountID: defaultAccount.accountID };
  } catch (error) {
    logger.error("Error in OnboardMemberController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      firstname,
      lastname,
      phone,
      defaultDenom,
      requestId,
    });
    logger.debug("Exiting OnboardMemberController with error", { requestId });
    return { error: "Internal Server Error" };
  }
}

export async function onboardMemberExpressHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering onboardMemberExpressHandler", {
    body: req.body,
    headers: req.headers,
    requestId,
  });

  try {
    const { firstname, lastname, phone, defaultDenom } = req.body;

    logger.debug("Validating input", { firstname, lastname, phone, defaultDenom, requestId });

    const firstnameValidation = validateName(firstname);
    if (!firstnameValidation.isValid) {
      logger.warn("Invalid first name", { firstname, message: firstnameValidation.message, requestId });
      res.status(400).json({ message: firstnameValidation.message });
      return;
    }

    const lastnameValidation = validateName(lastname);
    if (!lastnameValidation.isValid) {
      logger.warn("Invalid last name", { lastname, message: lastnameValidation.message, requestId });
      res.status(400).json({ message: lastnameValidation.message });
      return;
    }

    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      logger.warn("Invalid phone number", { phone, message: phoneValidation.message, requestId });
      res.status(400).json({ message: phoneValidation.message });
      return;
    }

    const denomValidation = validateDenomination(defaultDenom);
    if (!denomValidation.isValid) {
      logger.warn("Invalid default denomination", { defaultDenom, message: denomValidation.message, requestId });
      res.status(400).json({ message: denomValidation.message });
      return;
    }

    logger.debug("All validations passed", { requestId });

    logger.debug("Calling OnboardMemberController", {
      firstname,
      lastname,
      phone,
      defaultDenom,
      requestId,
    });

    const result = await OnboardMemberController(
      firstname,
      lastname,
      phone,
      defaultDenom,
      requestId
    );

    if ("error" in result) {
      logger.warn("Onboarding failed", {
        error: result.error,
        firstname,
        lastname,
        phone,
        defaultDenom,
        requestId,
      });
      res.status(400).json({ message: result.error });
    } else {
      logger.info("Onboarding successful", {
        firstname,
        lastname,
        phone,
        defaultDenom,
        requestId,
      });
      res.status(201).json(result);
    }
    logger.debug("Exiting onboardMemberExpressHandler successfully", {
      requestId,
    });
  } catch (error) {
    logger.error("Error in onboardMemberExpressHandler", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
      requestId,
    });
    logger.debug("Exiting onboardMemberExpressHandler with error", {
      requestId,
    });
    next(error);
  }
}
