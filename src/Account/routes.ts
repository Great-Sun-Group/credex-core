import express from "express";
import { apiVersionOneRoute } from "..";
import { CreateAccountController } from "./controllers/CreateAccountController";
import { GetAccountByHandleController } from "./controllers/GetAccountByHandleController";
import { GetAccountsListController } from "./controllers/GetAccountsListController";
import { UpdateAccountController } from "./controllers/UpdateAccountController";
import { AuthorizeForCompanyController } from "./controllers/AuthorizeForCompanyController";
import { UnauthorizeForCompanyController } from "./controllers/UnauthorizeForCompanyController";
import { UpdateSendOffersToController } from "./controllers/UpdateSendOffersToController";

export default function AccountRoutes(
  app: express.Application,
  jsonParser: any
) {
  app.post(
    `${apiVersionOneRoute}createAccount`,
    jsonParser,
    CreateAccountController
  );

  app.get(
    `${apiVersionOneRoute}getAccountByHandle`,
    jsonParser,
    GetAccountByHandleController
  );

  app.get(
    `${apiVersionOneRoute}getAccountsList`,
    jsonParser,
    GetAccountsListController
  );

  app.patch(
    `${apiVersionOneRoute}updateAccount`,
    jsonParser,
    UpdateAccountController
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

  app.post(
    `${apiVersionOneRoute}updateSendOffersTo`,
    jsonParser,
    UpdateSendOffersToController
  );
}
