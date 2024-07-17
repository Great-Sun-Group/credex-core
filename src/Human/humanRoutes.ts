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
}
