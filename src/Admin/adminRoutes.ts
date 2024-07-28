import express from "express";
import { apiVersionOneRoute } from "..";
import { ClearDevDbController } from "./controllers/clearDevDb";
import { ForceDcoController } from "./controllers/forceDCO";
import { ForceMtqController } from "./controllers/forceMTQ";
import { OfferAndAcceptCredexController } from "./controllers/offerAndAcceptCredex";
import { CreateTestMembersAndAccountsController } from "./controllers/createTestMembersAndAccounts";
import { CreateRandomFloatingCredexesController } from "./controllers/createRandomFloatingCredexes";
import { CreateTestLoopController } from "./controllers/createTestLoop";
import { GrowthTestController } from "./controllers/growthTest";
import { CheckLedgerVsSearchBalancesController } from "./controllers/checkLedgerVsSearchBalances";

export default function AdminRoutes(app: express.Application, jsonParser: any) {
  if (process.env.DEPLOYMENT === "demo") {
    app.delete(
      `${apiVersionOneRoute}clearDevDB`,
      jsonParser,
      ClearDevDbController
    );

    app.post(`${apiVersionOneRoute}forceDCO`, jsonParser, ForceDcoController);
    app.post(`${apiVersionOneRoute}forceMTQ`, jsonParser, ForceMtqController);

    app.post(
      `${apiVersionOneRoute}offerAndAcceptCredex`,
      jsonParser,
      OfferAndAcceptCredexController
    );

    app.post(
      `${apiVersionOneRoute}createTestMembersAndAccounts`,
      jsonParser,
      CreateTestMembersAndAccountsController
    );

    app.post(
      `${apiVersionOneRoute}createRandomFloatingCredexes`,
      jsonParser,
      CreateRandomFloatingCredexesController
    );

    app.post(
      `${apiVersionOneRoute}createTestLoop`,
      jsonParser,
      CreateTestLoopController
    );

    app.post(
      `${apiVersionOneRoute}growthTest`,
      jsonParser,
      GrowthTestController
    );

    app.get(
      `${apiVersionOneRoute}checkLedgerVsSearchBalances`,
      jsonParser,
      CheckLedgerVsSearchBalancesController
    );
  }
}
