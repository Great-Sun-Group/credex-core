import express from "express";
import { LoginMemberService } from "../services/LoginMember";
import logger from "../../../utils/logger";
import { validatePhone } from "../../../utils/validators";

export async function LoginMemberController(
  phone: string,
  requestId: string
): Promise<{ token: string } | { error: string }> {
  logger.debug("Entering LoginMemberController", { phone, requestId });

  try {
    logger.info("Attempting to login member", { phone, requestId });

    const loginResult = await LoginMemberService(phone);

    if (!loginResult.token) {
      logger.warn("Failed to login member", {
        phone,
        error: loginResult.error,
        requestId,
      });
      logger.debug("Exiting LoginMemberController with login failure", {
        requestId,
      });
      return { error: loginResult.error || "Failed to login member" };
    }

    logger.info("Member logged in successfully", { phone, requestId });
    logger.debug("Exiting LoginMemberController successfully", { requestId });
    return { token: loginResult.token };
  } catch (error) {
    logger.error("Error in LoginMemberController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      phone,
      requestId,
    });
    logger.debug("Exiting LoginMemberController with error", { requestId });
    return { error: "Internal Server Error" };
  }
}

export async function loginMemberExpressHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering loginMemberExpressHandler", {
    body: req.body,
    requestId,
  });

  try {
    const { phone } = req.body;

    if (!validatePhone(phone)) {
      logger.warn("Invalid phone number", { phone, requestId });
      res
        .status(400)
        .json({
          message:
            "Invalid phone number. Please provide a valid international phone number.",
        });
      logger.debug(
        "Exiting loginMemberExpressHandler with invalid phone number",
        { requestId }
      );
      return;
    }

    const result = await LoginMemberController(phone, requestId);

    if ("error" in result) {
      logger.warn("Login failed", { error: result.error, phone, requestId });
      res.status(400).json({ message: result.error });
    } else {
      logger.info("Login successful", { phone, requestId });
      res.status(200).json(result);
    }
    logger.debug("Exiting loginMemberExpressHandler successfully", {
      requestId,
    });
  } catch (error) {
    logger.error("Error in loginMemberExpressHandler", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
      requestId,
    });
    logger.debug("Exiting loginMemberExpressHandler with error", { requestId });
    next(error);
  }
}
