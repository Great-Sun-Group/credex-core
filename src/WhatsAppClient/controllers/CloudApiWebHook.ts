import express from "express";

export default function CloudApiWebhook(
  req: express.Request,
  res: express.Response
) {
  console.log("Well");
  res.send("Test Success");
}
