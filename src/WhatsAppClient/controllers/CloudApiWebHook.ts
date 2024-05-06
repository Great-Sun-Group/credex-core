import express from "express";
import { ActionDiscovery } from "../bot/ActionDiscovery";

export default function CloudApiWebhook(
  req: express.Request,
  res: express.Response
) {
  let message_type: string;
  console.log("Shouldn't you be here?", req.body);
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

  console.log(message_type);

  const receipent: string =
    req.body["entry"][0]["changes"][0]["value"]["messages"][0]["from"];
  const body: string =
    req.body["entry"][0]["changes"][0]["value"]["messages"][0];

  ActionDiscovery({ receipent, body });

  res.json({
    message: "Success",
    description: "Successfully received WhatsApp message.",
    status: "ok",
  });
  return;
}
