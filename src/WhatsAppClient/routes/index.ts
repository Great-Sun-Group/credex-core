import express from "express";
import { apiVersionOneRoute } from "../..";
import CloudApiWebhook from "../controllers/CloudApiWebHook";
import { VerificationWebhook } from "../controllers/VerificationWebHook";

export default function WhatsAppClientRoutes(
  app: express.Application,
  jsonParser: any
) {
  app.post(
    `${apiVersionOneRoute}whatsapp-cloudApi-webhook`,
    jsonParser,
    CloudApiWebhook
  );
  app.get(
    `${apiVersionOneRoute}whatsapp-cloudApi-webhook`,
    VerificationWebhook
  );
}
