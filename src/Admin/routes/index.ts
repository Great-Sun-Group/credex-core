import express from "express";
import { apiVersionOneRoute } from "../..";
import { ClearDevDbController } from "../controllers/ClearDevDbController";
import { ForceDcoController } from "../controllers/ForceDcoController";
import { ForceMtqController } from "../controllers/ForceMtqController";
import { OfferAndAcceptCredexController } from "../controllers/OfferAndAcceptCredexController";
import { CreateTestMembersController } from "../controllers/CreateTestMembersController";
import { CreateTestTransactionsController } from "../controllers/CreateTestTransactionsController";
import { CreateTestLoopController } from "../controllers/CreateTestLoopController";
import { GrowthTestController } from "../controllers/GrowthTestController";

export default function AdminRoutes(app: express.Application, jsonParser: any) {
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
    `${apiVersionOneRoute}createTestMembers`,
    jsonParser,
    CreateTestMembersController
  );

  app.post(
    `${apiVersionOneRoute}createTestTransactions`,
    jsonParser,
    CreateTestTransactionsController
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
}
