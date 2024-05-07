import express from "express";
import { ActionDiscovery } from "../bot/ActionDiscovery";
import { TextBody } from "../types/PayloadsFromWhatsApp";

export default function CloudApiWebhook(
  req: express.Request,
  res: express.Response
) {
  let message_type: string;

  try {
    message_type =
      req.body["entry"][0]["changes"][0]["value"]["messages"][0]["type"];
  } catch (error) {
    // console.log(error);
    return res
      .json({
        message: error,
        description: "We need a message type to contrinue",
        status: "error",
      })
      .status(400);
  }

  const receipent: string =
    req.body["entry"][0]["changes"][0]["value"]["messages"][0]["from"];
  const body: TextBody =
    req.body["entry"][0]["changes"][0]["value"]["messages"][0];

  if (message_type === "text") {
    const textBody: string = body.text.body;
    ActionDiscovery({ receipent, body: textBody });
  }

  res.json({
    message: "Success",
    description: "Successfully received WhatsApp message.",
    status: "ok",
  });
  return;
}
