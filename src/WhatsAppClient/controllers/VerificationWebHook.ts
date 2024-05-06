import express from "express";

export function VerificationWebhook(
  req: express.Request,
  res: express.Response
) {
  const challenge = req.query["hub.challenge"];
  res.send(challenge).status(200);
}
