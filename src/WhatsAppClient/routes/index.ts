import express from "express";
import { apiVersionOneRoute } from "../..";
import CloudApiWebhook from "../controllers/CloudApiWebHook";

export default function WhatsAppClientRoutes(app: express.Application) {
  app.get(`${apiVersionOneRoute}whatsapp-cloudApi-webhook`, CloudApiWebhook);
}
