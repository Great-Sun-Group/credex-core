import express from "express";
import { apiVersionOneRoute } from "../..";
import { CreateMemberController } from "../controllers/CreateMemberController";
import { CreateCompanyController } from "../controllers/CreateCompanyController";
import { GetMemberController } from "../controllers/GetMemberController";
import { WhatsAppHumanLoginController } from "../controllers/WhatsAppHumanLoginController";
import { GetMemberByHandleController } from "../controllers/GetMemberByHandleController";
import { GetMembersListController } from "../controllers/GetMembersListController";
import { UpdateMemberController } from "../controllers/UpdateMemberController";
import { AuthorizeForCompanyController } from "../controllers/AuthorizeForCompanyController";
import { UnauthorizeForCompanyController } from "../controllers/UnauthorizeForCompanyController";
import { GetOwnedAndAuthForCompaniesController } from "../controllers/GetOwnedAndAuthForCompaniesController";
import { SetDefaultAccountController } from "../controllers/SetDefaultAccountController";

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
    `${apiVersionOneRoute}whatsAppHumanLogin`,
    jsonParser,
    WhatsAppHumanLoginController
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

  app.get(
    `${apiVersionOneRoute}getOwnedAndAuthForCompanies`,
    jsonParser,
    GetOwnedAndAuthForCompaniesController
  );

  app.post(
    `${apiVersionOneRoute}setDefaultAccount`,
    jsonParser,
    SetDefaultAccountController
  );
}
