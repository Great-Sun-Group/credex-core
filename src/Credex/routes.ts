import express from "express";
import { apiVersionOneRoute } from "..";
import { OfferCredexController } from "./controllers/OfferCredexController";
import { AcceptCredexController } from "./controllers/AcceptCredexController";
import { AcceptCredexBulkController } from "./controllers/AcceptCredexBulkController";
import { DeclineCredexController } from "./controllers/DeclineCredexController";
import { CancelCredexController } from "./controllers/CancelCredexController";
import { GetCredexController } from "./controllers/GetCredexController";
import { GetLedgerController } from "./controllers/GetLedgerController";

export default function CredexRoutes(
  app: express.Application,
  jsonParser: any
) {
  app.post(
    `${apiVersionOneRoute}offerCredex`,
    jsonParser,
    OfferCredexController
  );

  app.put(
    `${apiVersionOneRoute}acceptCredex`,
    jsonParser,
    AcceptCredexController
  );

  app.put(
    `${apiVersionOneRoute}acceptCredexBulk`,
    jsonParser,
    AcceptCredexBulkController
  );

  app.put(
    `${apiVersionOneRoute}declineCredex`,
    jsonParser,
    DeclineCredexController
  );

  app.put(
    `${apiVersionOneRoute}cancelCredex`,
    jsonParser,
    CancelCredexController
  );

  app.get(`${apiVersionOneRoute}getCredex`, jsonParser, GetCredexController);

  app.get(`${apiVersionOneRoute}getLedger`, jsonParser, GetLedgerController);
}
