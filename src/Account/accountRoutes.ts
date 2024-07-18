import express from "express";
import { apiVersionOneRoute } from "..";
import { CreateAccountController } from "./controllers/createAccount";
import { GetAccountByHandleController } from "./controllers/getAccountByHandle";
import { UpdateAccountController } from "./controllers/updateAccount";
import { AuthorizeForAccountController } from "./controllers/authorizeForAccount";
import { UnauthorizeForAccountController } from "./controllers/unauthorizeForAccount";
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

  app.patch(
    `${apiVersionOneRoute}updateAccount`,
    jsonParser,
    UpdateAccountController
  );

  app.post(
    `${apiVersionOneRoute}authorizeForAccount`,
    jsonParser,
    AuthorizeForAccountController
  );

  app.post(
    `${apiVersionOneRoute}unauthorizeForAccount`,
    jsonParser,
    UnauthorizeForAccountController
  );

  app.post(
    `${apiVersionOneRoute}updateSendOffersTo`,
    jsonParser,
    UpdateSendOffersToController
  );
}
