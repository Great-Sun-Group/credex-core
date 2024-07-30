import express from "express";
import { apiVersionOneRoute } from "..";
import { OnboardMemberController } from "./controllers/onboardMember";
import { GetMemberDashboardByPhoneController } from "./controllers/getMemberDashboardByPhone";
import { GetMemberByHandleController } from "./controllers/getMemberByHandle";

export default function MemberRoutes(
  app: express.Application,
  jsonParser: any
) {
  app.post(
    `${apiVersionOneRoute}onboardMember`,
    jsonParser,
    OnboardMemberController
  );

  app.get(
    `${apiVersionOneRoute}getMemberDashboardByPhone`,
    jsonParser,
    GetMemberDashboardByPhoneController
  );

  app.get(
    `${apiVersionOneRoute}getMemberByHandle`,
    jsonParser,
    GetMemberByHandleController
  );
}
