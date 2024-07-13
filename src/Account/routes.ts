import express from "express";
import { apiVersionOneRoute } from "..";
import { CreateAccountController } from "./controllers/createAccount";
import { GetAccountByHandleController } from "./controllers/getAccountByHandle";
import { GetAccountsListController } from "./controllers/GetAccountsListController";
import { UpdateAccountController } from "./controllers/updateAccount";
import { AuthorizeForCompanyController } from "./controllers/authorizeForAccount";
import { UnauthorizeForCompanyController } from "./controllers/unauthorizeForAccount";
import { UpdateSendOffersToController } from "./controllers/updateSendOffersTo";

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
