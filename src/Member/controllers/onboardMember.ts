import express from "express";
import { OnboardMemberService } from "../services/OnboardMember";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
import logger from "../../../config/logger";

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
  if (firstname.length > 50 || lastname.length > 50) {
    return "First name and last name must be 50 characters or less";
  }

  // Phone number validation (without '+' prefix)
  const phoneRegex = /^[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    return "Invalid phone number format. It should be a sequence of 2 to 15 digits, not starting with 0.";
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
    return { error: validationError };
  }

  try {
    const onboardedMember = await OnboardMemberService(
      firstname,
      lastname,
      phone
    );

    if (!onboardedMember.onboardedMemberID) {
      return { error: onboardedMember.message || "Failed to onboard member" };
    }

    const memberDashboard = await GetMemberDashboardByPhoneService(phone);
    if (!memberDashboard) {
      return { error: "Could not retrieve member dashboard" };
    }

    return { memberDashboard };
  } catch (error) {
    logger.error("Error onboarding member:", error);
    return { error: "Internal Server Error" };
  }
}

// Express middleware wrapper
export async function onboardMemberExpressHandler(
  req: express.Request,
  res: express.Response
): Promise<void> {
  const { firstname, lastname, phone } = req.body;
  const result = await OnboardMemberController(firstname, lastname, phone);

  if ("error" in result) {
    res.status(400).json({ message: result.error });
  } else {
    res.status(200).json(result);
  }
}
