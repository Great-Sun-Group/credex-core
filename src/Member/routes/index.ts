import express from "express";
import { apiVersionOneRoute } from "../..";
import { CreateMemberController } from "../controllers/CreateMemberController";
import { CreateCompanyController } from "../controllers/CreateCompanyController";
import { GetMemberController } from "../controllers/GetMemberController";
import { WhatsAppLoginController } from "../controllers/WhatsAppLoginController";
import { GetMemberByHandleController } from "../controllers/GetMemberByHandleController";
import { GetMembersListController } from "../controllers/GetMembersListController";
import { UpdateMemberController } from "../controllers/UpdateMemberController";
import { AuthorizeForCompanyController } from "../controllers/AuthorizeForCompanyController";
import { UnauthorizeForCompanyController } from "../controllers/UnauthorizeForCompanyController";

export default function MemberRoutes(
  app: express.Application,
  jsonParser: any
) {
  app.post(
    `${apiVersionOneRoute}createMember`,
    jsonParser,
    CreateMemberController
  );

  app.post(
    `${apiVersionOneRoute}createCompany`,
    jsonParser,
    CreateCompanyController
  );

  app.get(
    `${apiVersionOneRoute}getMemberList`,
    jsonParser,
    GetMembersListController
  );

  app.get(`${apiVersionOneRoute}getMember`, jsonParser, GetMemberController);

  app.get(
    `${apiVersionOneRoute}whatsAppLogin`,
    jsonParser,
    WhatsAppLoginController
  );

  app.get(
    `${apiVersionOneRoute}getMemberByHandle`,
    jsonParser,
    GetMemberByHandleController
  );

  app.patch(
    `${apiVersionOneRoute}updateMember`,
    jsonParser,
    UpdateMemberController
  );

  app.post(
    `${apiVersionOneRoute}authorizeForCompany`,
    jsonParser,
    AuthorizeForCompanyController
  );

  app.post(
    `${apiVersionOneRoute}unauthorizeForCompany`,
    jsonParser,
    UnauthorizeForCompanyController
  );

}
