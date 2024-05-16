import express from "express";
import { apiVersionOneRoute } from "../..";
import { OfferCredexController } from "../controllers/OfferCredexController";
import { AcceptCredexController } from "../controllers/AcceptCredexController";
import { DeclineCredexController } from "../controllers/DeclineCredexController";
import { CancelCredexController } from "../controllers/CancelCredexController";
import { GetBalancesController } from "../controllers/GetBalancesController";

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
    `${apiVersionOneRoute}declineCredex`,
    jsonParser,
    DeclineCredexController
  );

  app.put(
    `${apiVersionOneRoute}cancelCredex`,
    jsonParser,
    CancelCredexController
  );

  app.get(
    `${apiVersionOneRoute}getBalances`,
    jsonParser,
    GetBalancesController
  );

}
