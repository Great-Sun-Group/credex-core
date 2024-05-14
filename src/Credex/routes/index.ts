import express from "express";
import { apiVersionOneRoute } from "../..";
import { GetBalancesController } from "../controllers/GetBalancesController";

export default function CredexRoutes(
  app: express.Application,
  jsonParser: any
) {

  app.get(
    `${apiVersionOneRoute}getBalances`,
    jsonParser,
    GetBalancesController
  );

}
