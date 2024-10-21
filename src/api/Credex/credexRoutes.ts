import express from "express";
import { OfferCredexController } from "./controllers/createCredex";
import { AcceptCredexController } from "./controllers/acceptCredex";
import { AcceptCredexBulkController } from "./controllers/acceptCredexBulk";
import { DeclineCredexController } from "./controllers/declineCredex";
import { CancelCredexController } from "./controllers/cancelCredex";
import { GetCredexController } from "./controllers/getCredex";
import { GetLedgerController } from "./controllers/getLedger";
import { validateRequest } from "../../middleware/validateRequest";
import {
  offerCredexSchema,
  acceptCredexSchema,
  declineCredexSchema,
  cancelCredexSchema,
  getCredexSchema,
  getLedgerSchema,
} from "./credexValidationSchemas";
import logger from "../../utils/logger";

export default function CredexRoutes() {
  const router = express.Router();
  logger.info("Initializing Credex routes");

  router.post(
    `/createCredex`,
    validateRequest(offerCredexSchema),
    OfferCredexController
  );
  logger.debug("Route registered: POST /offerCredex");

  router.post(
    `/acceptCredex`,
    validateRequest(acceptCredexSchema),
    AcceptCredexController
  );
  logger.debug("Route registered: POST /acceptCredex");

  router.post(
    `/acceptCredexBulk`,
    validateRequest({
      credexIDs: {
        sanitizer: (value: any) =>
          Array.isArray(value)
            ? value.map(acceptCredexSchema.credexID.sanitizer)
            : value,
        validator: (value: any) => {
          if (!Array.isArray(value)) {
            return { isValid: false, message: "credexIDs must be an array" };
          }
          for (const credexID of value) {
            const result = acceptCredexSchema.credexID.validator(credexID);
            if (!result.isValid) {
              return {
                isValid: false,
                message: `Invalid credexID: ${result.message}`,
              };
            }
          }
          return { isValid: true };
        },
      },
      signerID: acceptCredexSchema.signerID,
    }),
    AcceptCredexBulkController
  );
  logger.debug("Route registered: POST /acceptCredexBulk");

  router.post(
    `/declineCredex`,
    validateRequest(declineCredexSchema),
    DeclineCredexController
  );
  logger.debug("Route registered: POST /declineCredex");

  router.post(
    `/cancelCredex`,
    validateRequest(cancelCredexSchema),
    CancelCredexController
  );
  logger.debug("Route registered: POST /cancelCredex");

  router.post(
    `/getCredex`,
    validateRequest(getCredexSchema, "query"),
    GetCredexController
  );
  logger.debug("Route registered: POST /getCredex");

  router.post(
    `/getLedger`,
    validateRequest(getLedgerSchema, "query"),
    GetLedgerController
  );
  logger.debug("Route registered: POST /getLedger");

  logger.info("Credex routes initialized successfully", {
    module: "credexRoutes",
    routesCount: 7,
  });

  return router;
}
