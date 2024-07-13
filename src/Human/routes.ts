import express from "express";
import { apiVersionOneRoute } from "..";
import { OnboardHumanController } from "./controllers/onboardHuman";
import { GetHumanDashboardByPhoneController } from "./controllers/getHumanDashboardByPhone";

export default function HumanRoutes(app: express.Application, jsonParser: any) {
  app.post(
    `${apiVersionOneRoute}onboardHuman`,
    jsonParser,
    OnboardHumanController
  );

  app.get(
    `${apiVersionOneRoute}whatsAppLogin`,
    jsonParser,
    GetHumanDashboardByPhoneController
  );

  /*

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
  */
}
