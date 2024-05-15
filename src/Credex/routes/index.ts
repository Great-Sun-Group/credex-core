import express from "express";
import { apiVersionOneRoute } from "../..";
import { OfferCredexController } from "../controllers/OfferCredexController";
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

  app.get(
    `${apiVersionOneRoute}getBalances`,
    jsonParser,
    GetBalancesController
  );

}
