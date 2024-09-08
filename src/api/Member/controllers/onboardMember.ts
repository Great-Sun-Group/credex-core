import express from "express";
import { OnboardMemberService } from "../services/OnboardMember";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
import logger from "../../../../config/logger";
import { onboardMemberSchema } from "../validators/memberSchemas";

export async function OnboardMemberController(
  firstname: string,
  lastname: string,
  phone: string
): Promise<{ memberDashboard: any } | { error: string }> {
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
  try {
    const { error, value } = onboardMemberSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const { firstname, lastname, phone } = value;
    const result = await OnboardMemberController(firstname, lastname, phone);

    if ("error" in result) {
      res.status(400).json({ message: result.error });
    } else {
      res.status(201).json(result);
    }
  } catch (error) {
    logger.error("Error in onboardMemberExpressHandler", { error, body: req.body });
    next(error);
  }
}
