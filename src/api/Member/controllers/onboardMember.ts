import express from "express";
import { OnboardMemberService } from "../services/OnboardMember";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
import logger from "../../../utils/logger";
import { validateName, validatePhone } from "../../../utils/validators";
import { generateToken } from "../../../../config/authenticate";
import { searchSpaceDriver } from "../../../../config/neo4j";
import { CreateAccountController } from "../../Account/controllers/createAccount";
import { CreateAccountService } from "../../Account/services/CreateAccount";

export async function OnboardMemberController(
  firstname: string,
  lastname: string,
  phone: string,
  requestId: string
): Promise<{ memberDashboard: any; token: string; defaultAccountID: string } | { error: string }> {
  logger.debug("Entering OnboardMemberController", {
    firstname,
    lastname,
    phone,
    requestId,
  });

  try {
    logger.info("Onboarding new member", {
      firstname,
      lastname,
      phone,
      requestId,
    });

    const onboardedMember = await OnboardMemberService(
      firstname,
      lastname,
      phone
    );

    if (!onboardedMember.onboardedMemberID) {
      logger.warn("Failed to onboard member", {
        firstname,
        lastname,
        phone,
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
      requestId,
    });

    // Create default account for the new member
    logger.debug("Creating default account for new member", {
      memberID: onboardedMember.onboardedMemberID,
      requestId,
    });
    const defaultAccount = await CreateAccountService(
      onboardedMember.onboardedMemberID,
      "PERSONAL_CONSUMPTION",
      `${firstname} ${lastname} Personal`,
      phone,
      "USD",
      null,
      null
    );

    if (!defaultAccount.accountID) {
      logger.warn("Failed to create default account for new member", {
        memberID: onboardedMember.onboardedMemberID,
        error: defaultAccount.message,
        requestId,
      });
      return { error: "Failed to create default account for new member" };
    }

    logger.info("Default account created successfully", {
      memberID: onboardedMember.onboardedMemberID,
      accountID: defaultAccount.accountID,
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

    logger.debug("Retrieving member dashboard", { phone, requestId });
    const memberDashboard = await GetMemberDashboardByPhoneService(phone);
    if (!memberDashboard) {
      logger.warn("Could not retrieve member dashboard after onboarding", {
        phone,
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
    // Check for WHATSAPP_BOT_API_KEY header
    const clientOrigin = req.headers["whatsapp_bot_api_key"];
    const serverOrigin = process.env.WHATSAPP_BOT_API_KEY;

    logger.debug("Checking WHATSAPP_BOT_API_KEY", {
      clientOrigin,
      serverOrigin,
      requestId,
    });

    if (!clientOrigin || clientOrigin !== serverOrigin) {
      logger.warn("Unauthorized access attempt", { clientOrigin, requestId });
      res.status(401).json({ message: "Unauthorized" });
      logger.debug(
        "Exiting onboardMemberExpressHandler with unauthorized error",
        { requestId }
      );
      return;
    }

    const { firstname, lastname, phone } = req.body;

    logger.debug("Validating input", { firstname, lastname, phone, requestId });

    if (!validateName(firstname)) {
      logger.warn("Invalid first name", { firstname, requestId });
      res.status(400).json({
        message: "First name must be between 3 and 50 characters long",
      });
      logger.debug(
        "Exiting onboardMemberExpressHandler with invalid first name",
        { requestId }
      );
      return;
    }

    if (!validateName(lastname)) {
      logger.warn("Invalid last name", { lastname, requestId });
      res.status(400).json({
        message: "Last name must be between 3 and 50 characters long",
      });
      logger.debug(
        "Exiting onboardMemberExpressHandler with invalid last name",
        { requestId }
      );
      return;
    }

    if (!validatePhone(phone)) {
      logger.warn("Invalid phone number", { phone, requestId });
      res.status(400).json({
        message:
          "Invalid phone number. Please provide a valid international phone number.",
      });
      logger.debug(
        "Exiting onboardMemberExpressHandler with invalid phone number",
        { requestId }
      );
      return;
    }

    logger.debug("Calling OnboardMemberController", {
      firstname,
      lastname,
      phone,
      requestId,
    });

    const result = await OnboardMemberController(
      firstname,
      lastname,
      phone,
      requestId
    );

    if ("error" in result) {
      logger.warn("Onboarding failed", {
        error: result.error,
        firstname,
        lastname,
        phone,
        requestId,
      });
      res.status(400).json({ message: result.error });
    } else {
      logger.info("Onboarding successful", {
        firstname,
        lastname,
        phone,
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
