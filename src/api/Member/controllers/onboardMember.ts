import express from "express";
import { OnboardMemberService } from "../services/OnboardMember";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
import logger from "../../../../config/logger";
import { validateAccountName } from "../../../utils/validators";

function validateInput(
  firstname: string,
  lastname: string,
  phone: string
): string | null {
  if (!firstname || !lastname || !phone) {
    return "firstname, lastname, and phone are required";
  }
  if (
    typeof firstname !== "string" ||
    typeof lastname !== "string" ||
    typeof phone !== "string"
  ) {
    return "firstname, lastname, and phone must be strings";
  }
  if (!validateAccountName(firstname) || !validateAccountName(lastname)) {
    return "First name and last name must be between 3 and 50 characters";
  }

  // Phone number validation (with optional '+' prefix)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    return "Invalid phone number format. It should be a valid international phone number.";
  }

  return null;
}

export async function OnboardMemberController(
  firstname: string,
  lastname: string,
  phone: string
): Promise<{ memberDashboard: any } | { error: string }> {
  const validationError = validateInput(firstname, lastname, phone);
  if (validationError) {
    logger.warn("Invalid input for onboarding member", { firstname, lastname, phone, error: validationError });
    return { error: validationError };
  }

  try {
    logger.info("Onboarding new member", { firstname, lastname, phone });

    const onboardedMember = await OnboardMemberService(
      firstname,
      lastname,
      phone
    );

    if (!onboardedMember.onboardedMemberID) {
      logger.warn("Failed to onboard member", { firstname, lastname, phone, error: onboardedMember.message });
      return { error: onboardedMember.message || "Failed to onboard member" };
    }

    logger.info("Member onboarded successfully", { memberID: onboardedMember.onboardedMemberID });

    const memberDashboard = await GetMemberDashboardByPhoneService(phone);
    if (!memberDashboard) {
      logger.warn("Could not retrieve member dashboard after onboarding", { phone });
      return { error: "Could not retrieve member dashboard" };
    }

    logger.info("Member dashboard retrieved successfully", { memberID: onboardedMember.onboardedMemberID });
    return { memberDashboard };
  } catch (error) {
    logger.error("Error in OnboardMemberController", { error, firstname, lastname, phone });
    return { error: "Internal Server Error" };
  }
}

export async function onboardMemberExpressHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const { firstname, lastname, phone } = req.body;

  try {
    const result = await OnboardMemberController(firstname, lastname, phone);

    if ("error" in result) {
      res.status(400).json({ message: result.error });
    } else {
      res.status(201).json(result);
    }
  } catch (error) {
    logger.error("Error in onboardMemberExpressHandler", { error, firstname, lastname, phone });
    next(error);
  }
}
