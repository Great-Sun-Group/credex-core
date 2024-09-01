import express from "express";
import { apiVersionOneRoute } from "..";
import { RequestRecurringController } from "./controllers/requestRecurring";
import { AcceptRecurringController } from "./controllers/acceptRecurring";
import { DeclineRecurringController } from "./controllers/declineRecurring";

export default function RecurringRoutes(
  app: express.Application,
  jsonParser: any
) {
  app.post(
    `${apiVersionOneRoute}requestRecurring`,
    jsonParser,
    RequestRecurringController
  );

  app.post(
    `${apiVersionOneRoute}acceptRecurring`,
    jsonParser,
    AcceptRecurringController
  );

  app.post(
    `${apiVersionOneRoute}declineRecurring`,
    jsonParser,
    DeclineRecurringController
  );
}
